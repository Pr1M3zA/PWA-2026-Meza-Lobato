console.log("[SW] Script en ejecución");
console.log("[SW] Contexto global");
console.log("[SW] typeof Window => ", typeof window);
console.log("[SW] typeof document => ", typeof document);
console.log("[SW] typeof localStorage => ", typeof localStorage);

console.log("[SW] typeof IndexedDB => ", typeof indexedDB);
console.log("[SW] typeof caches => ", typeof caches);

console.log("[SW] Scope => ", self.registration.scope);

const CACHE_VERSION = "wl-shell-v1"

const APP_SHELL = [
  "./",
  "./index.html",
  "./404.html",
  "./styles/shell.css",
  "./styles/main.css",
  "./src/main.js",
  "./src/config.js",
  "./src/router/router.js",
  "./src/components/NavBar.js",
  "./src/utils/registerSW.js",
];

self.addEventListener("install", (event) => {
  console.log("[SW] install => precacheando", CACHE_VERSION);

  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));

});

self.addEventListener("activate", (event) => {
  console.log("[SW] activate => versión activa", CACHE_VERSION);

  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.filter((name) => name !== CACHE_VERSION)
        .map((name) => {
          console.log("[SW] Borrando caché vieja", name);
          return caches.delete(name);
        })
    )).then(() => self.clients.claim())
  );
})

self.addEventListener("fetch", (event) => {
  //console.log("[SW] fetch => ", event.request.method, event.request.url);
  const { request } = event;

  if (!shouldHandle(request)) {
    reportFetch(request, "ignored");
    return;
  }

  event.respondWith(
    handleRequest(event)
  );
});

function shouldHandle(request) {
  // POST/PUT/DELETE: la Cache API solo almacena respuestas de GET; el resto pasa sin respondWith.
  if (request.method !== "GET") return false;
  // Terceros (CDN, APIs externas): no los interceptamos; que los gestione el navegador directamente.
  if (new URL(request.url).origin !== self.location.origin) return false;
  // "only-if-cached" cross-origin lanza error en Chromium; lo dejamos ir a la red sin responder.
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") return false;

  return true;
}

async function handleRequest(event) {
  const { request } = event;
  const cache = await caches.open(CACHE_VERSION);
  const lookup = request.mode === "navigate" ? "./index.html" : request;

  const cached = await cache.match(lookup);
  if (cached) {
    console.log("[SW] HIT => ", request.url);
    reportFetch(request, "cache");
    return cached;
  }

  console.log("[SW] MISS => ", request.url);
  const response = await fetch(request);

  if (response.ok) {
    event.waitUntil(cache.put(request, response.clone()));
  }

  reportFetch(request, "network");
  return response;
}

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    console.log("[SW] Mensaje SKIP_WAITING recibido, forzando activación");
    self.skipWaiting();
  }
});

function reportFetch(request, source) {
  self.clients.matchAll({ type: "window" }).then((clients) => {
    console.log("[SW] reportFetch", source, request.url, "→ clientes:", clients.length);
    const path = request.url.replace(self.location.origin, "");
    clients.forEach((client) =>
      client.postMessage({ type: "FETCH_LOG", method: request.method, path, source })
    );
  });
}