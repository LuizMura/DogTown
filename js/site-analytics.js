(function trackSiteAnalytics() {
  "use strict";

  if (document.body && document.body.id === "admin-body") {
    return;
  }

  const VISITOR_ID_KEY = "dogtownVisitorId";
  const endpoint = window.DOGTOWN_ANALYTICS_API || "/api/analytics/event";

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

  function sendEvent(payload) {
    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(endpoint, blob);
      return;
    }

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Ignore analytics transport errors to avoid UX impact.
    });
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
