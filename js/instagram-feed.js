(function () {
  const feedElement = document.querySelector("[data-instagram-feed]");
  const mobileQuery = window.matchMedia("(max-width: 700px)");
  const AUTO_PLAY_MS = 4500;
  const FEED_BATCH_SIZE = 6;
  let cachedPosts = [];
  let cachedProfile = null;
  let nextCursor = null;
  let isLoadingMore = false;
  let loadMoreObserver = null;
  let resizeTimer = null;

  if (!feedElement) {
    return;
  }

  const isLocalFile = window.location.protocol === "file:";
  const hostApi =
    "http://" + window.location.hostname + ":3000/api/instagram-feed";
  const defaultApi = isLocalFile
    ? "http://localhost:3000/api/instagram-feed"
    : "/api/instagram-feed";

  const endpoint = window.DOGTOWN_INSTAGRAM_API || defaultApi;

  function formatDate(value) {
    if (!value) {
      return "Instagram";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function chunkPosts(posts, size) {
    const groups = [];

    for (let index = 0; index < posts.length; index += size) {
      groups.push(posts.slice(index, index + size));
    }

    return groups;
  }

  function formatCount(value) {
    if (!Number.isFinite(value)) {
      return "--";
    }

    return new Intl.NumberFormat("pt-BR").format(value);
  }

  function renderProfileHeader(profile, posts) {
    const username = escapeHtml(profile?.username || "dogtownbrewrp");
    const profileUrl =
      profile?.profileUrl || "https://www.instagram.com/dogtownbrewrp/";
    const profilePicture = profile?.profilePictureUrl || "img/index/logo.png";
    const mediaCount = Number.isFinite(profile?.mediaCount)
      ? profile.mediaCount
      : posts.length;

    return [
      '<div class="instagram-profile">',
      '<a class="instagram-profile-main" href="' +
        profileUrl +
        '" target="_blank" rel="noopener noreferrer">',
      '<img class="instagram-profile-photo" src="' +
        profilePicture +
        '" alt="Perfil do Instagram DogTown" loading="lazy" />',
      '<div class="instagram-profile-meta">',
      '<p class="instagram-profile-name">@' + username + "</p>",
      '<div class="instagram-profile-stats">',
      "<span><strong>" +
        formatCount(mediaCount) +
        "</strong> Publicacoes</span>",
      "<span><strong>" +
        formatCount(profile?.followersCount) +
        "</strong> Seguidores</span>",
      "<span><strong>" +
        formatCount(profile?.followsCount) +
        "</strong> Seguindo</span>",
      "</div>",
      "</div>",
      "</a>",
      '<a class="instagram-follow-button" href="' +
        profileUrl +
        '" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-instagram"></i><span>Seguir</span></a>',
      "</div>",
    ].join("");
  }

  function buildCard(post) {
    const caption = (post.caption || "").slice(0, 90);
    const safeCaption = escapeHtml(caption);
    const safeDate = escapeHtml(formatDate(post.timestamp));

    return [
      '<a class="instagram-card" href="' +
        post.permalink +
        '" target="_blank" rel="noopener noreferrer">',
      '<img src="' +
        post.imageUrl +
        '" alt="Publicacao Instagram DogTown" loading="lazy" />',
      '<span class="instagram-card-date">' + safeDate + "</span>",
      '<p class="instagram-card-caption">' +
        (safeCaption || "Ver post no Instagram") +
        "</p>",
      "</a>",
    ].join("");
  }

  function renderPosts(posts, profile, hasMore, loadingMore) {
    const cardsPerSlide = mobileQuery.matches ? 1 : 2;
    const groups = chunkPosts(posts, cardsPerSlide);
    const slides = groups
      .map(function (group) {
        return [
          '<div class="instagram-slide">',
          group.map(buildCard).join(""),
          "</div>",
        ].join("");
      })
      .join("");

    const dots = groups
      .map(function (_, index) {
        return (
          '<button class="instagram-dot' +
          (index === 0 ? " is-active" : "") +
          '" type="button" data-instagram-dot="' +
          index +
          '" aria-label="Ir para slide ' +
          (index + 1) +
          '"></button>'
        );
      })
      .join("");

    const loadMoreLabel = loadingMore
      ? "Carregando mais posts..."
      : "Role para carregar mais posts";
    const loadMoreMarkup = hasMore
      ? '<div class="instagram-load-more-wrap"><p class="instagram-load-more' +
        (loadingMore ? " is-loading" : "") +
        '" data-instagram-load-more-sentinel>' +
        loadMoreLabel +
        "</p></div>"
      : "";

    feedElement.innerHTML =
      renderProfileHeader(profile, posts) +
      '<div class="instagram-carousel">' +
      '<button class="instagram-nav instagram-nav-prev" type="button" aria-label="Anterior">&#10094;</button>' +
      '<div class="instagram-viewport">' +
      '<div class="instagram-track">' +
      slides +
      "</div>" +
      "</div>" +
      '<button class="instagram-nav instagram-nav-next" type="button" aria-label="Proximo">&#10095;</button>' +
      "</div>" +
      '<div class="instagram-pagination">' +
      dots +
      "</div>" +
      loadMoreMarkup;

    setupCarousel();
    setupInfiniteScroll();
  }

  function disconnectInfiniteScroll() {
    if (loadMoreObserver) {
      loadMoreObserver.disconnect();
      loadMoreObserver = null;
    }
  }

  function requestNextPage() {
    if (isLoadingMore || !nextCursor) {
      return;
    }

    isLoadingMore = true;
    renderPosts(cachedPosts, cachedProfile, Boolean(nextCursor), true);

    fetchFeedWithFallback(nextCursor)
      .then(function (data) {
        const incomingPosts = Array.isArray(data?.posts) ? data.posts : [];

        cachedPosts = mergePosts(cachedPosts, incomingPosts);
        nextCursor =
          typeof data?.pagination?.nextCursor === "string"
            ? data.pagination.nextCursor
            : null;
      })
      .catch(function () {
        // Mantem os posts atuais caso a proxima pagina falhe.
      })
      .finally(function () {
        isLoadingMore = false;
        renderPosts(cachedPosts, cachedProfile, Boolean(nextCursor), false);
      });
  }

  function setupInfiniteScroll() {
    disconnectInfiniteScroll();

    const sentinel = feedElement.querySelector(
      "[data-instagram-load-more-sentinel]",
    );

    if (!sentinel || typeof IntersectionObserver !== "function") {
      return;
    }

    loadMoreObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            requestNextPage();
          }
        });
      },
      {
        root: null,
        rootMargin: "260px 0px 260px 0px",
        threshold: 0.01,
      },
    );

    loadMoreObserver.observe(sentinel);
  }

  function mergePosts(existingPosts, incomingPosts) {
    const seen = new Set();
    const merged = [];

    existingPosts.concat(incomingPosts).forEach(function (post) {
      const key = String(post?.id || post?.permalink || "");

      if (!key || seen.has(key)) {
        return;
      }

      seen.add(key);
      merged.push(post);
    });

    return merged;
  }

  function setupCarousel() {
    const track = feedElement.querySelector(".instagram-track");
    const viewport = feedElement.querySelector(".instagram-viewport");
    const slides = Array.from(feedElement.querySelectorAll(".instagram-slide"));
    const dots = Array.from(
      feedElement.querySelectorAll("[data-instagram-dot]"),
    );
    const prevButton = feedElement.querySelector(".instagram-nav-prev");
    const nextButton = feedElement.querySelector(".instagram-nav-next");
    let currentIndex = 0;
    let autoPlayId = null;
    let touchStartX = 0;
    let touchEndX = 0;

    if (
      !track ||
      !viewport ||
      slides.length === 0 ||
      !prevButton ||
      !nextButton
    ) {
      return;
    }

    function goToSlide(index) {
      currentIndex = Math.max(0, Math.min(index, slides.length - 1));
      updateCarousel();
    }

    function updateCarousel() {
      track.style.transform = "translateX(-" + currentIndex * 100 + "%)";

      prevButton.disabled = currentIndex === 0;
      nextButton.disabled = currentIndex === slides.length - 1;
      prevButton.hidden = slides.length <= 1;
      nextButton.hidden = slides.length <= 1;

      dots.forEach(function (dot, index) {
        dot.classList.toggle("is-active", index === currentIndex);
      });
    }

    function stopAutoPlay() {
      if (autoPlayId) {
        window.clearInterval(autoPlayId);
        autoPlayId = null;
      }
    }

    function startAutoPlay() {
      stopAutoPlay();

      if (slides.length <= 1) {
        return;
      }

      autoPlayId = window.setInterval(function () {
        currentIndex =
          currentIndex === slides.length - 1 ? 0 : currentIndex + 1;
        updateCarousel();
      }, AUTO_PLAY_MS);
    }

    function handleSwipe() {
      const deltaX = touchEndX - touchStartX;

      if (Math.abs(deltaX) < 40) {
        return;
      }

      if (deltaX < 0) {
        goToSlide(currentIndex + 1);
      } else {
        goToSlide(currentIndex - 1);
      }
    }

    prevButton.addEventListener("click", function () {
      goToSlide(currentIndex - 1);
      startAutoPlay();
    });

    nextButton.addEventListener("click", function () {
      goToSlide(currentIndex + 1);
      startAutoPlay();
    });

    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        goToSlide(Number(dot.getAttribute("data-instagram-dot")));
        startAutoPlay();
      });
    });

    viewport.addEventListener(
      "touchstart",
      function (event) {
        touchStartX = event.changedTouches[0].clientX;
        touchEndX = touchStartX;
        stopAutoPlay();
      },
      { passive: true },
    );

    viewport.addEventListener(
      "touchend",
      function (event) {
        touchEndX = event.changedTouches[0].clientX;
        handleSwipe();
        startAutoPlay();
      },
      { passive: true },
    );

    viewport.addEventListener("mouseenter", stopAutoPlay);
    viewport.addEventListener("mouseleave", startAutoPlay);
    viewport.addEventListener("focusin", stopAutoPlay);
    viewport.addEventListener("focusout", startAutoPlay);

    updateCarousel();
    startAutoPlay();
  }

  function rerenderIfNeeded() {
    if (cachedPosts.length === 0) {
      return;
    }

    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      renderPosts(
        cachedPosts,
        cachedProfile,
        Boolean(nextCursor),
        isLoadingMore,
      );
    }, 120);
  }

  function renderError() {
    feedElement.innerHTML =
      '<p class="instagram-status">Nao foi possivel carregar as postagens agora. Veja no <a href="https://www.instagram.com/dogtownbrewrp/" target="_blank" rel="noopener noreferrer">Instagram oficial</a>.</p>';
  }

  function fetchFeed(url) {
    return fetch(url).then(function (response) {
      if (!response.ok) {
        throw new Error("Erro ao buscar feed");
      }

      return response.json();
    });
  }

  function buildFeedUrl(baseUrl, afterCursor) {
    const separator = baseUrl.indexOf("?") >= 0 ? "&" : "?";
    let url = baseUrl + separator + "limit=" + FEED_BATCH_SIZE;

    if (afterCursor) {
      url += "&after=" + encodeURIComponent(afterCursor);
    }

    return url;
  }

  function getCandidateBaseUrls() {
    if (endpoint === "/api/instagram-feed") {
      return [
        "/api/instagram-feed",
        hostApi,
        "http://localhost:3000/api/instagram-feed",
      ];
    }

    if (!isLocalFile && endpoint === hostApi) {
      return [hostApi, "http://localhost:3000/api/instagram-feed"];
    }

    return [endpoint];
  }

  function fetchFeedWithFallback(afterCursor) {
    const candidates = getCandidateBaseUrls();
    let chain = Promise.reject(new Error("No endpoint available"));

    candidates.forEach(function (baseUrl) {
      chain = chain.catch(function () {
        return fetchFeed(buildFeedUrl(baseUrl, afterCursor));
      });
    });

    return chain;
  }

  fetchFeedWithFallback("")
    .then(function (data) {
      if (!data || !Array.isArray(data.posts) || data.posts.length === 0) {
        renderError();
        return;
      }

      cachedPosts = data.posts;
      cachedProfile = data.profile || null;
      nextCursor =
        typeof data?.pagination?.nextCursor === "string"
          ? data.pagination.nextCursor
          : null;
      renderPosts(cachedPosts, cachedProfile, Boolean(nextCursor), false);
    })
    .catch(function () {
      renderError();
    });

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", rerenderIfNeeded);
  } else {
    mobileQuery.addListener(rerenderIfNeeded);
  }
})();
