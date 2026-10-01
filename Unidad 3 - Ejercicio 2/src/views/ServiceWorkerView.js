import { BASE_URL } from "../config.js";
import { SW_URL, SW_SCOPE, SW_NARROW_URL, SW_NARROW_SCOPE, registerNarrowServiceWorker } from "../utils/registerSW.js";

const PARENT_SCOPE = BASE_URL.slice(0, BASE_URL.lastIndexOf("/") + 1);

const SCOPE_TEST_PATHS = [
  { label: "Raíz de la app", path: `${BASE_URL}/` },
  { label: "Ruta del router", path: `${BASE_URL}/acerca` },
  { label: "Archivo de la app", path: `${BASE_URL}/src/main.js` },
  { label: "Raíz SIN diagonal final", path: BASE_URL.slice(0, BASE_URL.lastIndexOf("/") + 1)  },
  { label: "Otro proyecto del mismo dominio", path: `${PARENT_SCOPE}otro-proyecto/` },
  { label: "Raíz del dominio", path: "/" },
];

const WINNER_TEST_PATHS = [
  { label: "Ruta del router (fuera de src/)", path: `${BASE_URL}/configuracion/service-worker` },
  { label: "Página dentro del scope estrecho", path: `${BASE_URL}/src/views/AboutView.js` },
  { label: "Recurso JS dentro de src/", path: `${BASE_URL}/src/utils/registerSW.js` },
  { label: "Raíz de la app", path: `${BASE_URL}/` },
];

async function getStatus() {
  if(!"serviceWorker" in navigator) {
    return { supported: false };
  }

  const registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);

  const worker =
    registration?.active ?? registration?.waiting ?? registration?.installing ?? null;

  return {
    supported: true,
    secure: window.isSecureContext,
    registered: Boolean(registration),
    scope: registration?.scope ?? null,
    scriptURL: worker?.scriptURL ?? null,
    state: worker?.state ?? null,
    controlled: Boolean(navigator.serviceWorker.controller)
  };
}

async function getAllRegistrations() {
  if (!("serviceWorker" in navigator)) return [];

  const regs = await navigator.serviceWorker.getRegistrations();

  return regs.map((reg, index) => {
    const worker = reg.active ?? reg.waiting ?? reg.installing ?? null;
    return {
      index: index + 1,
      scope: reg.scope,
      scriptURL: worker?.scriptURL ?? reg.active?.scriptURL ?? null,
      state: worker?.state ?? null,
    };
  }).sort((a, b) => (b.scope?.length ?? 0) - (a.scope?.length ?? 0));
}

function whoControls(url, registrations) {
  const candidates = registrations
    .filter((r) => url.startsWith(r.scope))
    .sort((a, b) => b.scope.length - a.scope.length);

  return candidates[0] ?? null;
}

const badge = (text, kind = "neutral") =>
  `<span class="badge badge--${kind}">${text}</span>`;
const yes = (text = "Sí") => badge(text, "ok");
const no = (text = "No") => badge(text, "no");

function renderStatus(status) {
  if (!status.supported) {
    return `<p>${no("Este navegador no soporta Service Workers.")}</p>`;
  }

  const rows = [
    ["¿El navegador soporta Service Workers?", status.supported ? yes("Sí") : no("No")],
    ["¿Contexto seguro?", status.secure ? yes("Sí") : no("No")],
    ["¿SW registrado?", status.registered ? yes("Sí") : no("No")],
    ["Scope", status.scope ? `<code>${status.scope}</code>` : "—"],
    ["Script", status.scriptURL ? `<code>${status.scriptURL}</code>` : "—"],
    ["Estado del worker", status.state ? badge(status.state, "neutral") : "—"],
    ["¿Controla esta página?", status.controlled ? yes("Sí") : no("No") ],
  ];

  return `
    <table class="sw-status-table">
      <tbody>
        ${rows.map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join("")}
      </tbody>
    </table>
  `;
}

function renderScopeTable(scope) {
  const effectiveScope = scope ?? new URL(SW_SCOPE, window.location.origin).href;

  const rows = SCOPE_TEST_PATHS.map(({ label, path }) => {
    const url = new URL(path, window.location.origin).href;
    const inside = url.startsWith(effectiveScope);

    return `
      <tr>
        <td>${label}</td>
        <td><code>${path}</code></td>
        <td>${inside ? yes("Dentro") : no("Fuera")}</td>
      </tr>
    `;
  }).join("");

  return `
    <table class="sw-scope-table">
      <thead>
        <tr><th>Caso</th><th>Ruta</th><th>¿Dentro del scope?</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderRegistrationsTable(registrations) {
  if (!registrations.length) {
    return `<p>${no("No hay Service Workers registrados.")}</p>`;
  }

  const rows = registrations.map((r) => `
    <tr>
      <td>${r.index}</td>
      <td><code>${r.scope}</code></td>
      <td><code>${r.scriptURL ?? "—"}</code></td>
      <td>${r.state ? badge(r.state, "neutral") : "—"}</td>
    </tr>
  `).join("");

  return `
    <table class="sw-registrations-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Scope</th>
          <th>Script</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderWinnerTable(registrations) {
  const rows = WINNER_TEST_PATHS.map(({ label, path }) => {
    const url = new URL(path, window.location.origin).href;
    const winner = whoControls(url, registrations);

    let controller;
    if (!winner) {
      controller = no("Ninguno");
    } else {
      const isNarrow = winner.scope === new URL(SW_NARROW_SCOPE, window.location.origin).href;
      controller = isNarrow
        ? `${badge("Estrecho", "ok")} <code>${winner.scriptURL ?? "—"}</code>`
        : `${badge("Ancho", "neutral")} <code>${winner.scriptURL ?? "—"}</code>`;
    }

    return `
      <tr>
        <td>${label}</td>
        <td><code>${path}</code></td>
        <td>${controller}</td>
      </tr>
    `;
  }).join("");

  return `
    <table class="sw-winner-table">
      <thead>
        <tr><th>Caso</th><th>Ruta</th><th>SW que la controla</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function refreshRegistrationsPanel() {
  const box = document.getElementById("sw-registrations");
  const winnerBox = document.getElementById("sw-winner-table");
  if (!box) return;

  const registrations = await getAllRegistrations();
  box.innerHTML = renderRegistrationsTable(registrations);
  if (winnerBox) winnerBox.innerHTML = renderWinnerTable(registrations);
}

async function updatePanels() {
  const statusBox = document.getElementById("sw-status");
  const scopeBox = document.getElementById("sw-scope-table");
  if (!statusBox || !scopeBox) return;

  const status = await getStatus();
  statusBox.innerHTML = renderStatus(status);
  scopeBox.innerHTML = renderScopeTable(status.scope);

  await refreshRegistrationsPanel();
}

function showResult(message) {
  const output = document.getElementById("sw-result");
  if (output) output.textContent = message;
}

async function tryWideScope() {
  showResult(`Registrando ${SW_URL} con scope / (la raíz del origen, más amplio que su carpeta) ...`);

  try {
    await navigator.serviceWorker.register(SW_URL, { scope: "/" });
    showResult("El navegador aceptó el registro");
  } catch (error) {
    showResult(`${error.name}: ${error.message}`);
  }
}

async function tryNarrowScope() {
  showResult(`Registrando ${SW_NARROW_URL} con scope ${SW_NARROW_SCOPE} ...`);

  try {
    await registerNarrowServiceWorker();
    showResult("SW estrecho registrado.");
  } catch (error) {
    showResult(`${error?.name ?? "Error"}: ${error?.message ?? error}`);
  }

  await refreshRegistrationsPanel();
}

async function unregisterServiceWorker() {
  const registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);

  if (!registration) {
    showResult("No hay ningún SW registrado en este scope.");
    return;
  }

  const removed = await registration.unregister();
  showResult(
    removed
      ? "SW dado de baja. Esta pestaña sigue controlada hasta que se recargue (F5);"
      : "No se pudo dar de baja el SW."
  );
  await updatePanels();
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-sw-action]");
  if (!button || !("serviceWorker" in navigator)) return;

  const action = button.dataset.swAction;

  if (action === "refresh") await updatePanels();
  else if (action === "wide-scope") await tryWideScope();
  else if (action === "narrow-scope") await tryNarrowScope();
  else if (action === "unregister") await unregisterServiceWorker();
});

export default async function ServiceWorkerView() {
  const status = await getStatus();
  const registrations = await getAllRegistrations();

  return `
    <div class="card">
      <h2>Service Worker - Vista de Diagnóstico</h2>
      <div id="sw-status">${renderStatus(status)}</div>
      <div class="sw-actions">
        <button type="button" class="btn" data-sw-action="refresh">Actualizar estado</button>
        <button type="button" class="btn btn-logout" data-sw-action="unregister">Dar de baja el SW</button>
      </div>
    </div>

    <div class="card">
      <h3>Verificador de scope</h3>
      <div id="sw-scope-table">${renderScopeTable(status.scope)}</div>
    </div>

    <div class="card">
      <h3>Registros activos</h3>
      <div class="sw-actions">
        <button type="button" class="btn" data-sw-action="narrow-scope">Registrar SW scope estrecho</button>
      </div>
      <div id="sw-registrations">${renderRegistrationsTable(registrations)}</div>
    </div>

    <div class="card">
      <h3>¿Cuál gana para una página dentro del scope estrecho?</h3>
      <div id="sw-winner-table">${renderWinnerTable(registrations)}</div>
    </div>

    <div class="card">
      <h3>Demo: scope inválido</h3>
      <div class="sw-actions">
        <button type="button" class="btn" data-sw-action="wide-scope">Probar scope más amplio</button>
      </div>
      <p id="sw-result" class="sw-result">Intentando registrar sw.js con scope / (la raíz del origen, más amplio que su carpeta).</p>
    </div>
  `;
}
