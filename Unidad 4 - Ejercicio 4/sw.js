console.log("[SW] Script en ejecución");
console.log("[SW] Contexto global");
console.log("[SW] typeof Window => ", typeof window);
console.log("[SW] typeof document => ", typeof document);
console.log("[SW] typeof localStorage => ", typeof localStorage);

console.log("[SW] typeof IndexedDB => ", typeof indexedDB);
console.log("[SW] typeof caches => ", typeof caches);

console.log("[SW] Scope => ", self.registration.scope);

const CACHE_VERSION = "wl-shell-v13";

const API_ORIGIN = "https://wires-and-ladders-api.vercel.app";
const CDN_ORIGIN = "https://esm.sh";
const ALLOWED_HOSTS = [self.location.origin, CDN_ORIGIN, new URL(API_ORIGIN).hostname, "fonts.googleapis.com", "fonts.gstatic.com"];

let announcedApiOrigin = null;


const SYNC_TAG = "sync-outbox";
const OUTBOX_DB = "wlweb";
const OUTBOX_STORE = "outbox";

function openOutboxDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OUTBOX_DB);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => console.warn("[SW] IndexedDB bloqueado por otra pestaña");
  });
}

function storeOp(db, mode, run) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, mode);
    const request = run(tx.objectStore(OUTBOX_STORE));
    let result;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

const outboxGetAll = (db) => storeOp(db, "readonly", (s) => s.getAll());
const outboxGet = (db, id) => storeOp(db, "readonly", (s) => s.get(id));
const outboxDelete = (db, id) => storeOp(db, "readwrite", (s) => s.delete(id));
const outboxPut = (db, item) => storeOp(db, "readwrite", (s) => s.put(item));

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
  "./src/services/apiClient.js",
  "./src/services/authService.js",
  "./src/services/backgroundsService.js",
  "./src/services/boardsService.js",
  "./src/services/cookieService.js",
  "./src/services/dbService.js",
  "./src/services/disciplinesService.js",
  "./src/services/educationService.js",
  "./src/services/groupsService.js",
  "./src/services/infoAndQuestionsService.js",
  "./src/services/knowledgeAreasService.js",
  "./src/services/levelsService.js",
  "./src/services/shortcutsService.js",
  "./src/services/subtopicsService.js",
  "./src/services/themeService.js",
  "./src/services/tilesService.js",
  "./src/services/topicsService.js",
  "./src/utils/cnnStatus.js",
  "./src/utils/backgroundSync.js",
  "./src/utils/outboxUI.js",
  "./src/utils/errorMessage.js",
  "./src/utils/installButton.js",
  "./src/utils/installPrompt.js",
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
  "./src/views/GruposView.js",
  "./src/views/GroupDetailsView.js",
  "./src/views/HomeView.js",
  "./src/views/NotFoundView.js",
  "./src/views/PreguntasView.js",
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
  "./src/views/templates/grupo-detalle.html",
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
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
];

self.addEventListener("install", (event) => {
  console.log("[SW] install => precacheando", CACHE_VERSION);

  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const results = await Promise.allSettled(
        APP_SHELL.map((url) => cache.add(url))
      );
      const failed = results
        .map((r, i) => (r.status === "rejected" ? APP_SHELL[i] : null))
        .filter(Boolean);
      console.log("[SW] Precaché:", APP_SHELL.length - failed.length, "ok,", failed.length, "falló");
      if (failed.length) console.warn("[SW] No se pudieron cachear:", failed);
    })
  );
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
  const { request } = event;

  if (!shouldHandle(request)) {
    return;
  }

  event.respondWith(
    handleRequest(event)
  );
});

function isApiUrl(url) {
  return url.origin === API_ORIGIN ||
    (announcedApiOrigin !== null && url.origin === announcedApiOrigin);
}

function shouldHandle(request) {
  if (request.method !== "GET") return false;

  const url = new URL(request.url);

  if (url.origin === self.location.origin) return true;

  if (isApiUrl(url)) return true;

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

  if (isApiUrl(url)) {
    if (url.pathname.includes("/education/knowledge_area")) return staleWhileRevalidate;
    if (url.pathname.includes("/education/discipline")) return staleWhileRevalidate;
    if (url.pathname.includes("/education/levels")) return staleWhileRevalidate;
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
    return cached;
  }

  console.log("[SW] Cache First · MISS => ", request.url);
  try {
    const response = await fromNetwork(request);

    if (response.ok) {
      event.waitUntil(cache.put(key, response.clone()));
    }

    return response;
  } catch {
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
    return response;
  } catch {
    const cached = await cache.match(key);

    if (cached) {
      console.log("[SW] Network First · red caída, uso caché => ", request.url);
      return cached;
    }

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
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(revalidation);
    console.log("[SW] SWR · entrego caché y actualizo en segundo plano => ", request.url);
    return cached;
  }

  const response = await revalidation;
  if (response) return response;

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
    return;
  }

  if (event.data?.type === "SET_API_ORIGIN") {
    announcedApiOrigin = event.data.origin ?? null;
    console.log("[SW] Origen de API anunciado:", announcedApiOrigin ?? "(ninguno)");
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag !== SYNC_TAG) return;

  // lastChance = true: si este intento falla, el navegador ya no reintentará.
  console.log("[SW] sync =>", event.tag, "· lastChance:", event.lastChance);
  event.waitUntil(flushOutbox(event.lastChance === true));
});

let flushing = false;

async function flushOutbox(isLastChance) {
  if (flushing) {
    console.log("[SW] Ya hay un vaciado en curso, se omite este sync");
    return;
  }
  flushing = true;

  const db = await openOutboxDB();

  try {
    if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
      console.warn("[SW] El store outbox aún no existe, nada que enviar");
      return;
    }

    const pending = await outboxGetAll(db);
    console.log("[SW] Cola de salida =>", pending.length, "pendiente(s)");

    for (const item of pending) {
      if (item.needsAttention) {
        console.warn("[SW] Se omite (requiere atención) =>", item.label);
        continue;
      }

      const current = await outboxGet(db, item.id);
      if (!current) {
        console.log("[SW] El item ya no está en la cola, se omite =>", item.label);
        continue;
      }
      const live = { ...item, ...current };

      let response;
      try {
        response = await fetch(live.url, {
          method: live.method ?? "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: live.token || "NoToken",
          },
          body: JSON.stringify(live.payload),
        });
      } catch (error) {
        await outboxPut(db, {
          ...live,
          attempts: (live.attempts ?? 0) + 1,
          lastError: "Sin conexión",
          lastAttemptAt: new Date().toISOString(),
        });
        throw error;
      }

      if (!response.ok) {
        const permanent = response.status >= 400 && response.status < 500;
        await outboxPut(db, {
          ...live,
          attempts: (live.attempts ?? 0) + 1,
          lastError: `HTTP ${response.status}`,
          lastAttemptAt: new Date().toISOString(),
          needsAttention: permanent || isLastChance,
        });
        notifyClients({
          type: permanent || isLastChance ? "OUTBOX_ATTENTION" : "OUTBOX_RETRY",
          id: live.id,
          label: live.label,
          status: response.status,
        });
        console.warn("[SW] Rechazado por el servidor =>", live.label, response.status);

        if (permanent || isLastChance) continue;
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json().catch(() => ({}));
      // Sólo se borra cada elemento tras la confirmación del servidor.
      await outboxDelete(db, live.id);
      console.log("[SW] Enviado y borrado de la cola =>", live.label);

      notifyClients({
        type: "OUTBOX_SENT",
        id: live.id,
        label: live.label,
        serverId: data?.id ?? null,
        disciplineId: live.disciplineId ?? null,
        levelId: live.levelId ?? null,
      });
    }
  } finally {
    db.close();
    flushing = false;
  }
}

function notifyClients(message) {
  self.clients.matchAll({ type: "window" }).then((clients) => {
    clients.forEach((client) => client.postMessage(message));
  });
}
