const MAX_LOG = 25;

const SOURCE_LABELS = {
  cache: `<span class="badge badge--ok lab-ok">Caché (HIT)</span>`,
  network: `<span class="badge badge--neutral">Red (MISS)</span>`,
  ignored: `<small class="meta-muted">Ignorada (el SW no responde)</small>`,
};

const STRATEGY_LABELS = {
  "cache-first": `<span class="badge badge--ok">Cache First</span>`,
  "network-first": `<span class="badge badge--no">Network First</span>`,
  "stale-while-revalidate": `<span class="badge badge--neutral">SWR</span>`,
};

let fetchLog = [];
try {
  const stored = sessionStorage.getItem("fetchLog");
  if (stored) fetchLog = JSON.parse(stored);
} catch (e) {}

function buildLogHTML() {
  if (fetchLog.length === 0) {
    return `<p class="meta-muted">Sin eventos todavía. El SW aún no escucha el evento <code>fetch</code>.</p>`;
  }

  const rows = fetchLog
    .map(
      ({ time, method, path, source, strategy }) => `
        <tr>
          <td>${time}</td>
          <td>${method}</td>
          <td><small><code>${path}</code></small></td>
          <td>${STRATEGY_LABELS[strategy] ?? `<small class="meta-muted">—</small>`}</td>
          <td>${SOURCE_LABELS[source] ?? source}</td>
        </tr>
      `
    )
    .join("");

  return `
    <table class="lab-table lab-log-table">
      <thead>
        <tr><th>Hora</th><th>Método</th><th>Recurso</th><th>Estrategia</th><th>Resultado</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderLog() {
  const box = document.getElementById("lab-log");
  if (box) box.innerHTML = buildLogHTML();
}

navigator.serviceWorker?.addEventListener("message", (event) => {
  console.log("[Page] mensaje SW:", event.data);
  if (event.data?.type !== "FETCH_LOG") return;

  fetchLog.unshift({
    ...event.data,
    time: new Date().toLocaleTimeString("es-MX"),
  });
  fetchLog.splice(MAX_LOG);
  
  try {
    sessionStorage.setItem("fetchLog", JSON.stringify(fetchLog));
  } catch (e) {}
  
  renderLog();
});

async function getCacheEntries() {
  if (!("caches" in window)) return [];

  const names = await caches.keys();
  const groups = await Promise.all(
    names.map(async (name) => {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      return requests.map((request) => ({ cacheName: name, url: request.url }));
    })
  );
  return groups.flat();
}

function buildCacheHTML(entries) {
  if (entries.length === 0) {
    return `<p class="meta-muted">No hay ninguna caché todavía.</p>`;
  }

  const rows = entries
    .map(
      ({ cacheName, url }) => `
        <tr>
          <td><code>${cacheName}</code></td>
          <td><small><code>${url.replace(window.location.origin, "")}</code></small></td>
          <td>
            <button type="button" class="btn btn-logout"
              data-lab-action="delete-entry"
              data-cache="${cacheName}"
              data-url="${url}">Borrar</button>
          </td>
        </tr>
      `
    )
    .join("");

  return `
    <table class="lab-table">
      <thead>
        <tr><th>Caché</th><th>Recurso</th><th>Acción</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function renderCacheContent() {
  const box = document.getElementById("lab-cache");
  if (box) box.innerHTML = buildCacheHTML(await getCacheEntries());
}

function showResult(message) {
  const output = document.getElementById("lab-result");
  if (output) output.textContent = message;
}

async function deleteFromCache(cacheName, url) {
  const cache = await caches.open(cacheName);
  const deleted = await cache.delete(url);

  showResult(
    deleted
      ? `cache.delete() → true. Se eliminó ${url.replace(window.location.origin, "")} de ${cacheName}.`
      : "cache.delete() → false. Esa entrada no existía."
  );
  await renderCacheContent();
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-lab-action]");
  if (!button) return;

  const action = button.dataset.labAction;

  if (action === "refresh-cache") {
    await renderCacheContent();
  } else if (action === "delete-entry") {
    await deleteFromCache(button.dataset.cache, button.dataset.url);
  } else if (action === "clear-log") {
    fetchLog.length = 0;
    try {
      sessionStorage.removeItem("fetchLog");
    } catch (e) {}
    renderLog();
  }
});

export default async function FetchLabView() {
  const entries = await getCacheEntries();

  const html = `
    <div class="view-root">
      <div class="view-header">
        <h1 class="view-title">Fetch y Cache API</h1>
      </div>

      <div class="view-content view-content--padded">
        <div class="card">
          <h3>Registro de peticiones vistas por el SW</h3>
          <div id="lab-log">${buildLogHTML()}</div>
          <div class="lab-actions">
            <button type="button" class="btn" data-lab-action="clear-log">Limpiar registro</button>
          </div>
        </div>

        <div class="card">
          <h3>Contenido de Cache Storage</h3>
          <div id="lab-cache">${buildCacheHTML(entries)}</div>
          <div class="lab-actions">
            <button type="button" class="btn" data-lab-action="refresh-cache">Actualizar lista</button>
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(renderLog, 0);
  return html;
}