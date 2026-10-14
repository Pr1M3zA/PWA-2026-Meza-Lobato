console.log("[SW] Script en ejecución");
console.log("[SW] Contexto global");
console.log("[SW] typeof Window => ", typeof window);
console.log("[SW] typeof document => ", typeof document);
console.log("[SW] typeof localStorage => ", typeof localStorage);

console.log("[SW] typeof IndexedDB => ", typeof indexedDB);
console.log("[SW] typeof caches => ", typeof caches);

console.log("[SW] Scope => ", self.registration.scope);

const CACHE_VERSION = "wl-shell-v6";

const API_ORIGIN = "https://wires-and-ladders-api.vercel.app";
const ALLOWED_HOSTS = [self.location.origin, new URL(API_ORIGIN).hostname, "fonts.googleapis.com", "fonts.gstatic.com"];

const APP_SHELL = [
  "./",
  "./index.html",
  "./404.html",
  "./src/assets/background.svg",
  "./src/assets/bg-pattern.svg",
  "./src/assets/bottom-design.svg",
  "./src/assets/wireladders-logo.svg",
  "./manifest.json",
  "./icons/icon-1024.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon-167.png",
  "./icons/apple-touch-icon-180.png",
  "./icons/apple-touch-startup-1242x2688.png",
  "./icons/favicon-32.png",
  "./src/components/AreaCard.js",
  "./src/components/BoardCard.js",
  "./src/components/Breadcrumb.js",
  "./src/components/ConfirmModal.js",
  "./src/components/DisciplineCard.js",
  "./src/components/DuplicateBoardModal.js",
  "./src/components/EmptyState.js",
  "./src/components/LevelFilter.js",
  "./src/components/NavBar.js",
  "./src/components/QuestionCard.js",
  "./src/components/QuestionFormModal.js",
  "./src/components/SubtopicCard.js",
  "./src/components/SubtopicFormModal.js",
  "./src/components/TileCard.js",
  "./src/components/TopicCard.js",
  "./src/components/TopicFormModal.js",
  "./src/components/UserShell.js",
  "./src/assets/icons.svg",
  "./src/components/board/Background.js",
  "./src/components/board/Board.js",
  "./src/components/board/HexTile.js",
  "./src/components/board/Hexagon.js",
  "./src/components/board/Ladder.js",
  "./src/components/board/StartFinishLine.js",
  "./src/components/board/TileInfoCard.js",
  "./src/components/board/Wire.js",
  "./src/config.js",
  "./src/main.js",
  "./src/router/router.js",
  "./src/services/activityLogger.js",
  "./src/services/apiClient.js",
  "./src/services/authService.js",
  "./src/services/backgroundsService.js",
  "./src/services/boardsService.js",
  "./src/services/cookieService.js",
  "./src/services/dbService.js",
  "./src/services/disciplinesService.js",
  "./src/services/educationService.js",
  "./src/services/infoAndQuestionsService.js",
  "./src/services/knowledgeAreasService.js",
  "./src/services/levelsService.js",
  "./src/services/shortcutsService.js",
  "./src/services/subtopicsService.js",
  "./src/services/themeService.js",
  "./src/services/tilesService.js",
  "./src/services/topicsService.js",
  "./src/utils/cnnStatus.js",
  "./src/utils/errorMessage.js",
  "./src/utils/moduleLoader.js",
  "./src/utils/registerSW.js",
  "./src/utils/slugify.js",
  "./src/utils/svg.js",
  "./src/utils/templateLoader.js",
  "./src/views/AboutView.js",
  "./src/views/AreasConocimientoView.js",
  "./src/views/BoardEditView.js",
  "./src/views/ConfigView.js",
  "./src/views/ContactView.js",
  "./src/views/DisciplinasView.js",
  "./src/views/EditView.js",
  "./src/views/ErrorView.js",
  "./src/views/FetchLabView.js",
  "./src/views/GruposView.js",
  "./src/views/HomeView.js",
  "./src/views/NotFoundView.js",
  "./src/views/PreguntasView.js",
  "./src/views/ServiceWorkerView.js",
  "./src/views/SubtemasView.js",
  "./src/views/TablerosView.js",
  "./src/views/TemasView.js",
  "./src/views/TileDetailView.js",
  "./src/views/templates/acerca.html",
  "./src/views/templates/areas-conocimiento.html",
  "./src/views/templates/board-edit.html",
  "./src/views/templates/config.html",
  "./src/views/templates/contacto.html",
  "./src/views/templates/disciplinas.html",
  "./src/views/templates/editar.html",
  "./src/views/templates/grupos.html",
  "./src/views/templates/home.html",
  "./src/views/templates/not-found.html",
  "./src/views/templates/preguntas.html",
  "./src/views/templates/subtemas.html",
  "./src/views/templates/tableros.html",
  "./src/views/templates/temas.html",
  "./src/views/templates/tile-detail.html",
  "./styles/board.css",
  "./styles/education.css",
  "./styles/main.css",
  "./styles/shell.css",
  "https://fonts.googleapis.com/css2?family=Jomhuria&display=swap",
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0",
  "https://wires-and-ladders-api.vercel.app"
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
  if (request.method !== "GET") return false;

  const url = new URL(request.url);

  if (url.origin === self.location.origin) return true;

  if (ALLOWED_HOSTS.includes(url.hostname)) return true;

  if (request.cache === "only-if-cached" && request.mode !== "same-origin") return false;

  return false;
}

async function handleRequest(event) {
  const { request } = event;
  const cache = await caches.open(CACHE_VERSION);
  const key = request.mode === "navigate" ? "./index.html" : request;

  const strategy = pickStrategy(request);
  return strategy(event, cache, key);
}
function pickStrategy(request) {
  const url = new URL(request.url);

  if (url.origin === API_ORIGIN) {
    if (url.pathname.includes("/education/knowledge_area")) return staleWhileRevalidate;
    if (url.pathname.includes("/education/discipline")) return staleWhileRevalidate;
    if (url.pathname.includes("/sync/tile-types")) return staleWhileRevalidate;
    return networkFirst;
  }

  if (url.pathname.includes("/src/assets/")) return staleWhileRevalidate;

  return cacheFirst;
}

async function cacheFirst(event, cache, key) {
  const { request } = event;

  const cached = await cache.match(key);
  if (cached) {
    console.log("[SW] Cache First · HIT => ", request.url);
    reportFetch(request, "cache", "cache-first");
    return cached;
  }

  console.log("[SW] Cache First · MISS => ", request.url);
  try {
    const response = await fromNetwork(request);

    if (response.ok) {
      event.waitUntil(cache.put(key, response.clone()));
    }

    reportFetch(request, "network", "cache-first");
    return response;
  } catch (error) {
    reportFetch(request, "fallback", "cache-first");
    return offlineFallback();
  }
}

async function networkFirst(event, cache, key) {
  const { request } = event;

  try {
    const response = await fromNetwork(request);

    if (response.ok) {
      event.waitUntil(cache.put(key, response.clone()));
    }

    console.log("[SW] Network First · red => ", request.url);
    reportFetch(request, "network", "network-first");
    return response;
  } catch (error) {
    const cached = await cache.match(key);

    if (cached) {
      console.log("[SW] Network First · red caída, uso caché => ", request.url);
      reportFetch(request, "cache", "network-first");
      return cached;
    }

    reportFetch(request, "fallback", "network-first");
    return offlineFallback();
  }
}

async function staleWhileRevalidate(event, cache, key) {
  const { request } = event;

  const cached = await cache.match(key);

  const revalidation = fromNetwork(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(key, response.clone());
        reportFetch(request, "updated", "stale-while-revalidate");
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(revalidation);
    console.log("[SW] SWR · entrego caché y actualizo en segundo plano => ", request.url);
    reportFetch(request, "cache", "stale-while-revalidate");
    return cached;
  }

  const response = await revalidation;
  if (response) {
    reportFetch(request, "network", "stale-while-revalidate");
    return response;
  }

  reportFetch(request, "fallback", "stale-while-revalidate");
  return offlineFallback();
}

function fromNetwork(request) {
  return fetch(request, { cache: "no-store" });
}

function offlineFallback() {
  return new Response(
    JSON.stringify({ offline: true, message: "Sin conexión y sin copia en caché" }),
    {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "application/json; charset=utf-8" },
    }
  );
}

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    console.log("[SW] Mensaje SKIP_WAITING recibido, forzando activación");
    self.skipWaiting();
  }
});

function reportFetch(request, source, strategy) {
  self.clients.matchAll({ type: "window" }).then((clients) => {
    console.log("[SW] reportFetch", source, request.url, "→ clientes:", clients.length);
    const path = request.url.replace(self.location.origin, "");
    clients.forEach((client) =>
      client.postMessage({ type: "FETCH_LOG", method: request.method, path, strategy, source })
    );
  });
}