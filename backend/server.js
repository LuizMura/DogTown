const path = require("path");
const fs = require("fs/promises");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const projectRoot = path.resolve(__dirname, "..");
const envFilePath = path.resolve(__dirname, ".env");
const analyticsFilePath = path.resolve(__dirname, "analytics-store.json");

app.use(cors());
app.use(express.json());
app.use(express.static(projectRoot));

const PORT = process.env.PORT || 3000;
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 1800000);
const INSTAGRAM_LIMIT = Number(process.env.INSTAGRAM_LIMIT || 6);
const MAX_INSTAGRAM_LIMIT = Number(process.env.MAX_INSTAGRAM_LIMIT || 24);
const IG_TOKEN_REFRESH_INTERVAL_MS = Number(
  process.env.IG_TOKEN_REFRESH_INTERVAL_MS || 24 * 60 * 60 * 1000,
);

let instagramAccessToken = process.env.INSTAGRAM_ACCESS_TOKEN || "";
let tokenRefreshInFlight = null;
let lastTokenRefreshAttemptAt = 0;

let cache = {
  expiresAt: 0,
  pages: {},
  profile: null,
};

let analyticsStore = {
  totals: { pageViews: 0, clicks: 0 },
  visitors: {},
  pages: {},
  pageDaily: {},
  daily: {},
  updatedAt: Date.now(),
};

let analyticsWriteQueue = Promise.resolve();

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizePageName(page) {
  const raw = String(page || "index.html").trim();
  if (!raw) return "index.html";
  return raw.slice(0, 120);
}

function normalizeEventType(type) {
  if (type === "click") return "click";
  return "pageview";
}

function ensureAnalyticsShape(store) {
  if (!store || typeof store !== "object") {
    return {
      totals: { pageViews: 0, clicks: 0 },
      visitors: {},
      pages: {},
      pageDaily: {},
      daily: {},
      updatedAt: Date.now(),
    };
  }

  return {
    totals: {
      pageViews: Number(store.totals?.pageViews || 0),
      clicks: Number(store.totals?.clicks || 0),
    },
    visitors:
      typeof store.visitors === "object" && store.visitors
        ? store.visitors
        : {},
    pages: typeof store.pages === "object" && store.pages ? store.pages : {},
    pageDaily:
      typeof store.pageDaily === "object" && store.pageDaily
        ? store.pageDaily
        : {},
    daily: typeof store.daily === "object" && store.daily ? store.daily : {},
    updatedAt: Number(store.updatedAt || Date.now()),
  };
}

async function loadAnalyticsStore() {
  try {
    const raw = await fs.readFile(analyticsFilePath, "utf8");
    analyticsStore = ensureAnalyticsShape(JSON.parse(raw));
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("Could not load analytics store:", error.message);
    }
  }
}

function persistAnalyticsStore() {
  analyticsStore.updatedAt = Date.now();

  analyticsWriteQueue = analyticsWriteQueue
    .then(() =>
      fs.writeFile(
        analyticsFilePath,
        JSON.stringify(analyticsStore, null, 2),
        "utf8",
      ),
    )
    .catch((error) => {
      console.warn("Could not persist analytics store:", error.message);
    });
}

function registerAnalyticsEvent(event) {
  const type = normalizeEventType(event.type);
  const visitorId = String(event.visitorId || "").slice(0, 80);
  const page = normalizePageName(event.page);
  const dayKey =
    typeof event.dayKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(event.dayKey)
      ? event.dayKey
      : getTodayKey();

  if (visitorId) {
    analyticsStore.visitors[visitorId] = analyticsStore.visitors[visitorId] || {
      firstSeenAt: Date.now(),
    };
  }

  analyticsStore.pages[page] = analyticsStore.pages[page] || {
    views: 0,
    clicks: 0,
  };

  analyticsStore.pageDaily[dayKey] = analyticsStore.pageDaily[dayKey] || {};
  analyticsStore.pageDaily[dayKey][page] = analyticsStore.pageDaily[dayKey][
    page
  ] || {
    views: 0,
    clicks: 0,
  };

  analyticsStore.daily[dayKey] = analyticsStore.daily[dayKey] || {
    views: 0,
    clicks: 0,
  };

  if (type === "click") {
    analyticsStore.totals.clicks += 1;
    analyticsStore.pages[page].clicks += 1;
    analyticsStore.pageDaily[dayKey][page].clicks += 1;
    analyticsStore.daily[dayKey].clicks += 1;
  } else {
    analyticsStore.totals.pageViews += 1;
    analyticsStore.pages[page].views += 1;
    analyticsStore.pageDaily[dayKey][page].views += 1;
    analyticsStore.daily[dayKey].views += 1;
  }
}

function isInstagramAuthError(message) {
  if (!message) return false;

  const normalized = String(message).toLowerCase();
  return (
    normalized.includes("error validating access token") ||
    normalized.includes("access token") ||
    normalized.includes("oauth")
  );
}

function buildTokenRefreshUrl(token) {
  return (
    "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=" +
    encodeURIComponent(token)
  );
}

async function persistAccessTokenToEnv(token) {
  if (!token) return;

  try {
    const envContents = await fs.readFile(envFilePath, "utf8");
    const tokenLine = "INSTAGRAM_ACCESS_TOKEN=" + token;

    const hasTokenLine = /^INSTAGRAM_ACCESS_TOKEN=.*$/m.test(envContents);
    const updatedContents = hasTokenLine
      ? envContents.replace(/^INSTAGRAM_ACCESS_TOKEN=.*$/m, tokenLine)
      : envContents.trimEnd() + "\n" + tokenLine + "\n";

    if (updatedContents !== envContents) {
      await fs.writeFile(envFilePath, updatedContents, "utf8");
      process.env.INSTAGRAM_ACCESS_TOKEN = token;
      console.log("Instagram token persisted to backend/.env");
    }
  } catch (error) {
    console.warn(
      "Could not persist Instagram token to backend/.env:",
      error.message,
    );
  }
}

async function refreshInstagramAccessToken(options = {}) {
  const { force = false } = options;

  if (!instagramAccessToken) {
    return false;
  }

  if (!force) {
    const now = Date.now();
    if (
      lastTokenRefreshAttemptAt > 0 &&
      now - lastTokenRefreshAttemptAt < IG_TOKEN_REFRESH_INTERVAL_MS
    ) {
      return false;
    }
  }

  if (tokenRefreshInFlight) {
    return tokenRefreshInFlight;
  }

  tokenRefreshInFlight = (async () => {
    lastTokenRefreshAttemptAt = Date.now();

    const response = await fetch(buildTokenRefreshUrl(instagramAccessToken));

    if (!response.ok) {
      const details = await response.text();
      throw new Error("Instagram token refresh error: " + details);
    }

    const payload = await response.json();
    const refreshedToken = payload.access_token;

    if (typeof refreshedToken === "string" && refreshedToken.length > 0) {
      const previousToken = instagramAccessToken;
      instagramAccessToken = refreshedToken;

      if (refreshedToken !== previousToken) {
        await persistAccessTokenToEnv(refreshedToken);
      }
    }

    console.log(
      "Instagram token refreshed successfully (expires_in=" +
        String(payload.expires_in || "unknown") +
        "s)",
    );

    return true;
  })()
    .catch((error) => {
      console.warn("Instagram token refresh failed:", error.message);
      return false;
    })
    .finally(() => {
      tokenRefreshInFlight = null;
    });

  return tokenRefreshInFlight;
}

const tokenRefreshTimer = setInterval(() => {
  refreshInstagramAccessToken().catch(() => {
    // Erros ja sao tratados com log no refresh.
  });
}, IG_TOKEN_REFRESH_INTERVAL_MS);

if (typeof tokenRefreshTimer.unref === "function") {
  tokenRefreshTimer.unref();
}

async function fetchInstagramProfile() {
  const fieldSets = [
    [
      "username",
      "media_count",
      "followers_count",
      "follows_count",
      "profile_picture_url",
    ],
    ["username", "media_count"],
  ];

  let lastError = "";

  for (const fields of fieldSets) {
    const url =
      "https://graph.instagram.com/me?fields=" +
      encodeURIComponent(fields.join(",")) +
      "&access_token=" +
      encodeURIComponent(instagramAccessToken);

    const response = await fetch(url);

    if (!response.ok) {
      lastError = await response.text();
      continue;
    }

    const payload = await response.json();

    return {
      username: payload.username || "dogtownbrewrp",
      mediaCount: Number.isFinite(payload.media_count)
        ? payload.media_count
        : 0,
      followersCount: Number.isFinite(payload.followers_count)
        ? payload.followers_count
        : null,
      followsCount: Number.isFinite(payload.follows_count)
        ? payload.follows_count
        : null,
      profilePictureUrl: payload.profile_picture_url || null,
      profileUrl:
        "https://www.instagram.com/" +
        (payload.username || "dogtownbrewrp") +
        "/",
    };
  }

  throw new Error("Instagram profile API error: " + lastError);
}

function getPageCacheKey(limit, after) {
  return String(limit) + ":" + String(after || "");
}

function normalizeRequestedLimit(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return INSTAGRAM_LIMIT;
  }

  return Math.min(Math.floor(parsed), MAX_INSTAGRAM_LIMIT);
}

function normalizeAfterCursor(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, 200);
}

async function fetchInstagramPosts(options = {}) {
  const limit = normalizeRequestedLimit(options.limit);
  const after = normalizeAfterCursor(options.after);
  const fields = [
    "id",
    "caption",
    "media_type",
    "media_url",
    "thumbnail_url",
    "permalink",
    "timestamp",
  ].join(",");

  const params = new URLSearchParams({
    fields,
    access_token: instagramAccessToken,
    limit: String(limit),
  });

  if (after) {
    params.set("after", after);
  }

  const url = "https://graph.instagram.com/me/media?" + params.toString();

  const response = await fetch(url);

  if (!response.ok) {
    const details = await response.text();
    throw new Error("Instagram API error: " + details);
  }

  const payload = await response.json();
  const media = Array.isArray(payload.data) ? payload.data : [];
  const nextCursor =
    typeof payload?.paging?.cursors?.after === "string"
      ? payload.paging.cursors.after
      : null;

  return {
    posts: media
      .map((item) => ({
        id: item.id,
        caption: item.caption || "",
        permalink: item.permalink,
        imageUrl:
          item.media_type === "VIDEO" ? item.thumbnail_url : item.media_url,
        timestamp: item.timestamp,
      }))
      .filter((item) => item.permalink && item.imageUrl),
    nextCursor,
  };
}

app.get("/api/instagram-feed", async (req, res) => {
  if (!instagramAccessToken) {
    res.status(500).json({
      error:
        "Instagram credentials are not configured in environment variables.",
    });
    return;
  }

  const now = Date.now();
  const limit = normalizeRequestedLimit(req.query.limit);
  const after = normalizeAfterCursor(req.query.after);
  const pageCacheKey = getPageCacheKey(limit, after);

  if (cache.expiresAt > now && cache.pages[pageCacheKey]) {
    const cachedPage = cache.pages[pageCacheKey];
    res.json({
      source: "cache",
      profile: cache.profile,
      posts: cachedPage.posts,
      pagination: {
        nextCursor: cachedPage.nextCursor,
      },
    });
    return;
  }

  try {
    await refreshInstagramAccessToken();

    let page;
    let profile;

    try {
      [page, profile] = await Promise.all([
        fetchInstagramPosts({ limit, after }),
        fetchInstagramProfile().catch(() => null),
      ]);
    } catch (error) {
      if (isInstagramAuthError(error.message)) {
        const refreshed = await refreshInstagramAccessToken({ force: true });

        if (refreshed) {
          [page, profile] = await Promise.all([
            fetchInstagramPosts({ limit, after }),
            fetchInstagramProfile().catch(() => null),
          ]);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    cache = {
      expiresAt: now + CACHE_TTL_MS,
      pages: {
        ...cache.pages,
        [pageCacheKey]: page,
      },
      profile,
    };

    res.json({
      source: "instagram",
      profile,
      posts: page.posts,
      pagination: {
        nextCursor: page.nextCursor,
      },
    });
  } catch (error) {
    if (cache.pages[pageCacheKey]) {
      const stalePage = cache.pages[pageCacheKey];
      res.json({
        source: "stale-cache",
        profile: cache.profile,
        posts: stalePage.posts,
        pagination: {
          nextCursor: stalePage.nextCursor,
        },
      });
      return;
    }

    res.status(502).json({
      error: "Failed to fetch Instagram feed.",
      message: error.message,
    });
  }
});

app.post("/api/analytics/event", (req, res) => {
  try {
    registerAnalyticsEvent(req.body || {});
    persistAnalyticsStore();
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

app.get("/api/analytics/summary", (req, res) => {
  res.json(analyticsStore);
});

app.get("/api/ping", (req, res) => {
  res.json({ ok: true });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(projectRoot, "index.html"));
});

loadAnalyticsStore()
  .catch(() => {
    // Keep server start resilient even if analytics file is not readable.
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log("Instagram API running at http://localhost:" + PORT);
    });
  });
