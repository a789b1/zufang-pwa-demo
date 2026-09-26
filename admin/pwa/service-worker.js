const CACHE_NAME = "zufang-admin-shell-v1";
const APP_SHELL = ["/", "/#dashboard", "/pwa/manifest.webmanifest", "/pwa/icons/icon-192.png", "/pwa/icons/icon-512.png"];

function isSafeAsset(request) {
  if (request.method !== "GET" || request.headers.has("authorization")) return false;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return false;
  if (/(?:pay|payment|contract|download|upload|signature|signed|media)/i.test(url.pathname)) return false;

  const contentType = request.destination;
  return (["script", "style", "font"].includes(contentType)
      && url.pathname.startsWith("/assets/"))
    || url.pathname.startsWith("/pwa/");
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((name) => name.startsWith("zufang-admin-shell-") && name !== CACHE_NAME)
        .map((name) => caches.delete(name)),
    )),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
        return response;
      }).catch(() => caches.match("/")),
    );
    return;
  }

  if (!isSafeAsset(request)) return;

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      return response;
    })),
  );
});
