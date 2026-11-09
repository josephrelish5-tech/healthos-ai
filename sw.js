/* HealthOS AI offline application shell.
   Deliberately excludes all authenticated API responses and patient data. */
const CACHE_NAME = "healthos-shell-v41";
const APP_SHELL = ["./", "./index.html", "./styles.css?v=20261109-discovery-map-mobile-v1", "./app.js?v=20261107-healthos-brand-v1", "./hospital-discovery-map.js?v=20261109-discovery-map-mobile-v1", "./pharmacy-forecast.js", "./offline-ehr.js", "./pharmacy-offline.js", "./offline-sync-center.js", "./offline-department-tasks.js", "./hospital-incidents.js", "./hospital-compliance.js", "./compliance-evidence-vault.js", "./hospital-quality.js", "./clinical-governance.js", "./staff-credentialing.js", "./clinical-decision-support.js", "./departmental-knowledge.js"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("healthos-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isAppShell = url.origin === self.location.origin &&
    (url.pathname.endsWith("/") || /\/(index\.html|styles\.css|app\.js|pharmacy-forecast\.js|offline-ehr\.js|pharmacy-offline\.js|offline-sync-center\.js|offline-department-tasks\.js|hospital-incidents\.js|hospital-compliance\.js|compliance-evidence-vault\.js|hospital-quality\.js|clinical-governance\.js|staff-credentialing\.js|clinical-decision-support\.js|departmental-knowledge\.js|hospital-discovery-map\.js)$/.test(url.pathname));
  const isSupabaseLibrary = url.hostname === "cdn.jsdelivr.net" &&
    url.pathname.includes("/@supabase/supabase-js/");

  // Never intercept Supabase REST/Auth/Storage requests or other data endpoints.
  if (!isAppShell && !isSupabaseLibrary) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        await cache.put("./index.html", fresh.clone());
        return fresh;
      } catch (_) {
        return (await caches.match("./index.html")) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreSearch: false });
    if (cached) return cached;
    try {
      const fresh = await fetch(request);
      if (fresh && (fresh.ok || fresh.type === "opaque")) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, fresh.clone());
      }
      return fresh;
    } catch (_) {
      return cached || Response.error();
    }
  })());
});
