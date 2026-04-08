(function trackSiteAnalytics() {
  "use strict";

  if (document.body && document.body.id === "admin-body") {
    return;
  }

  const VISITOR_ID_KEY = "dogtownVisitorId";
  const ANALYTICS_LOCAL_FALLBACK_KEY = "dogtownAnalyticsV1";

  function getEndpointCandidates() {
    const configured = String(window.DOGTOWN_ANALYTICS_API || "").trim();
    const protocol =
      window.location.protocol === "file:" ? "http:" : window.location.protocol;
    const hostFallback =
      protocol + "//" + window.location.hostname + ":3000/api/analytics/event";
    const localhostFallback = "http://localhost:3000/api/analytics/event";
    const relativeFallback = "/api/analytics/event";

    return [configured, relativeFallback, hostFallback, localhostFallback]
      .filter(Boolean)
      .filter((value, index, arr) => arr.indexOf(value) === index);
  }

  function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function getPageKey() {
    const path = window.location.pathname || "index.html";
    return path.split("/").pop() || "index.html";
  }

  function ensureVisitorId() {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id =
        "v-" +
        Math.random().toString(36).slice(2, 10) +
        Date.now().toString(36);
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  }

  function loadLocalAnalytics() {
    try {
      const parsed = JSON.parse(
        localStorage.getItem(ANALYTICS_LOCAL_FALLBACK_KEY) || "null",
      );

      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch (_) {
      // Ignore malformed local analytics store.
    }

    return {
      totals: { pageViews: 0, clicks: 0 },
      visitors: {},
      pages: {},
      pageDaily: {},
      daily: {},
    };
  }

  function saveLocalAnalytics(analytics) {
    try {
      localStorage.setItem(
        ANALYTICS_LOCAL_FALLBACK_KEY,
        JSON.stringify(analytics),
      );
    } catch (_) {
      // Ignore storage quota and serialization issues.
    }
  }

  function mirrorEventLocally(payload) {
    const analytics = loadLocalAnalytics();
    const page = String(payload.page || "index.html");
    const dayKey =
      typeof payload.dayKey === "string" ? payload.dayKey : getTodayKey();
    const visitorId = String(payload.visitorId || "");

    analytics.pages = analytics.pages || {};
    analytics.daily = analytics.daily || {};
    analytics.pageDaily = analytics.pageDaily || {};
    analytics.visitors = analytics.visitors || {};
    analytics.totals = analytics.totals || { pageViews: 0, clicks: 0 };

    analytics.pages[page] = analytics.pages[page] || { views: 0, clicks: 0 };
    analytics.daily[dayKey] = analytics.daily[dayKey] || {
      views: 0,
      clicks: 0,
    };
    analytics.pageDaily[dayKey] = analytics.pageDaily[dayKey] || {};
    analytics.pageDaily[dayKey][page] = analytics.pageDaily[dayKey][page] || {
      views: 0,
      clicks: 0,
    };

    if (visitorId) {
      analytics.visitors[visitorId] = analytics.visitors[visitorId] || {
        firstSeenAt: Date.now(),
      };
    }

    if (payload.type === "click") {
      analytics.totals.clicks = Number(analytics.totals.clicks || 0) + 1;
      analytics.pages[page].clicks += 1;
      analytics.daily[dayKey].clicks += 1;
      analytics.pageDaily[dayKey][page].clicks += 1;
    } else {
      analytics.totals.pageViews = Number(analytics.totals.pageViews || 0) + 1;
      analytics.pages[page].views += 1;
      analytics.daily[dayKey].views += 1;
      analytics.pageDaily[dayKey][page].views += 1;
    }

    saveLocalAnalytics(analytics);
  }

  function sendEvent(payload) {
    mirrorEventLocally(payload);

    const body = JSON.stringify(payload);
    const endpoints = getEndpointCandidates();

    if (navigator.sendBeacon && endpoints[0]) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(endpoints[0], blob);
      return;
    }

    (async () => {
      for (const endpoint of endpoints) {
        try {
          await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          });
          break;
        } catch (_) {
          // Try next endpoint.
        }
      }
    })();
  }

  const basePayload = {
    visitorId: ensureVisitorId(),
    page: getPageKey(),
    dayKey: getTodayKey(),
  };

  sendEvent({ ...basePayload, type: "pageview" });

  document.addEventListener("click", () => {
    sendEvent({ ...basePayload, type: "click" });
  });
})();
