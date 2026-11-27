import { OUTBOX_CHANGED_EVENT, discardOutboxItem, getOutboxState, getSyncMode, requestSync, retryNow } from "./backgroundSync.js";

const CHIP_HTML = `
  <button type="button" class="outbox-chip" hidden aria-expanded="false"
          aria-label="Cola de sincronización" title="Cola de sincronización">
    <span class="material-symbols-outlined" aria-hidden="true">cloud_upload</span>
    <span class="outbox-chip__count">0</span>
  </button>
`;

const PANEL_HTML = `
  <div class="outbox-panel" id="outbox-panel" hidden>
    <header class="outbox-panel__head">
      <h2 class="outbox-panel__title">Cola de sincronización</h2>
      <button type="button" class="outbox-panel__close" data-outbox-close
              aria-label="Cerrar">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
    </header>

    <p class="outbox-panel__mode" data-outbox-mode></p>

    <button type="button" class="outbox-retry-btn" data-outbox-retry>
      <span class="material-symbols-outlined" aria-hidden="true">refresh</span>
      Reintentar ahora
    </button>

    <section class="outbox-panel__section">
      <h3 class="outbox-panel__subtitle">Pendientes <span data-outbox-pending-count>(0)</span></h3>
      <ul class="outbox-list" data-outbox-pending></ul>
      <p class="outbox-empty" data-outbox-empty>No hay nada pendiente.</p>
    </section>

    <section class="outbox-panel__section">
      <h3 class="outbox-panel__subtitle">Enviados</h3>
      <ul class="outbox-list outbox-list--sent" data-outbox-sent></ul>
    </section>
  </div>
`;

let panel = null;
let lastState = null;
let initialized = false;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]);
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString("es-MX");
  } catch {
    return "";
  }
}

function modeText(state) {
  if (!state.online) return "Sin conexión · los cambios se guardan en el dispositivo.";
  if (state.supported) return "Modo Background Sync · el navegador envía solo cuando hay red.";
  return "Plan B · reintento al volver la conexión, al abrir la app o con el botón.";
}

function pendingItemHTML(item) {
  const badge = item.needsAttention
    ? `<span class="outbox-badge outbox-badge--error" title="${escapeHTML(item.lastError ?? "")}">HTTP ${escapeHTML(item.lastError ?? "")}</span>`
    : `<span class="outbox-badge">${formatTime(item.createdAt)}</span>`;

  const action = item.needsAttention
    ? `<button type="button" class="outbox-discard" data-outbox-discard="${item.id}"
                title="Descartar y perder este cambio">Descartar</button>`
    : "";

  return `
    <li class="outbox-item">
      <span class="outbox-item__label">${escapeHTML(item.label)}</span>
      ${badge}
      ${action}
    </li>
  `;
}

function sentItemHTML(entry) {
  return `
    <li class="outbox-item outbox-item--sent">
      <span class="outbox-item__label">${escapeHTML(entry.label)}</span>
      <span class="outbox-badge outbox-badge--ok">
        ${entry.time}${entry.serverId ? ` · #${entry.serverId}` : ""}
      </span>
    </li>
  `;
}

function paintChips(state) {
  document.querySelectorAll(".outbox-chip").forEach((chip) => {
    const countEl = chip.querySelector(".outbox-chip__count");
    countEl.textContent = String(state.count);
    chip.hidden = state.count === 0;
    chip.classList.toggle("has-attention", state.attention > 0);
    chip.setAttribute(
      "aria-label",
      `${state.count} cambio(s) pendiente(s) de enviar`
    );
    chip.title = state.attention
      ? `${state.count} pendiente(s), ${state.attention} requiere(n) atención: vuelve a iniciar sesión`
      : `${state.count} pendiente(s) de enviar`;
  });
}

function paintPanel(state) {
  const modeEl = panel.querySelector("[data-outbox-mode]");
  const pendingEl = panel.querySelector("[data-outbox-pending]");
  const sentEl = panel.querySelector("[data-outbox-sent]");
  const emptyEl = panel.querySelector("[data-outbox-empty]");
  const retryBtn = panel.querySelector("[data-outbox-retry]");
  const countEl = panel.querySelector("[data-outbox-pending-count]");

  modeEl.textContent = modeText(state);
  modeEl.classList.toggle("is-offline", !state.online);
  retryBtn.hidden = state.count === 0;
  retryBtn.disabled = !state.online || state.count === 0;

  countEl.textContent = `(${state.count})`;
  pendingEl.innerHTML = state.pending.map(pendingItemHTML).join("");
  emptyEl.hidden = state.count > 0;
  sentEl.innerHTML = state.sentLog.map(sentItemHTML).join("");
}

async function refresh() {
  try {
    lastState = await getOutboxState();
    paintChips(lastState);
    if (panel) paintPanel(lastState);
  } catch (error) {
    console.warn("[PWA] No se pudo leer la cola: ", error);
  }
}

function closePanel() {
  if (!panel) return;
  panel.hidden = true;
  document.querySelectorAll(".outbox-chip").forEach((chip) =>
    chip.setAttribute("aria-expanded", "false")
  );
}

function togglePanel() {
  if (!panel) return;
  const willOpen = panel.hidden;
  panel.hidden = !willOpen;
  document.querySelectorAll(".outbox-chip").forEach((chip) =>
    chip.setAttribute("aria-expanded", String(willOpen))
  );
}

function mount() {
  // Hay dos .shell-actions en index.html (header móvil y sidebar desktop).
  document.querySelectorAll(".shell-actions").forEach((actions) => {
    if (actions.querySelector(".outbox-chip")) return;
    actions.insertAdjacentHTML("afterbegin", CHIP_HTML);
  });

  if (!document.getElementById("outbox-panel")) {
    document.body.insertAdjacentHTML("beforeend", PANEL_HTML);
  }
  panel = document.getElementById("outbox-panel");
  if (!panel) return;

  document.querySelectorAll(".outbox-chip").forEach((chip) => {
    chip.addEventListener("click", (event) => {
      event.stopPropagation();
      togglePanel();
    });
  });

  panel.addEventListener("click", async (event) => {
    const closeBtn = event.target.closest("[data-outbox-close]");
    if (closeBtn) {
      closePanel();
      return;
    }

    const retryBtn = event.target.closest("[data-outbox-retry]");
    if (retryBtn) {
      retryBtn.disabled = true;
      retryBtn.textContent = "Enviando…";
      // requestSync() decide: en modo BS registra el evento y lo envía el SW,
      // en Plan B hace el POST desde la página. Nunca ambos, o se duplica.
      if (getSyncMode() === "background-sync") {
        await requestSync();
      } else {
        await retryNow();
      }
      await refresh();
      retryBtn.disabled = false;
      retryBtn.innerHTML =
        '<span class="material-symbols-outlined" aria-hidden="true">refresh</span> Reintentar ahora';
      return;
    }

    const discardBtn = event.target.closest("[data-outbox-discard]");
    if (discardBtn) {
      await discardOutboxItem(Number(discardBtn.dataset.outboxDiscard));
      await refresh();
    }
  });

  document.addEventListener("click", (event) => {
    if (!panel || panel.hidden) return;
    if (event.target.closest(".outbox-panel") || event.target.closest(".outbox-chip")) return;
    closePanel();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel && !panel.hidden) closePanel();
  });
}

export function mountOutboxUI() {
  if (initialized) return;
  initialized = true;

  mount();
  refresh();

  window.addEventListener(OUTBOX_CHANGED_EVENT, refresh);
  window.addEventListener("online", refresh);
  window.addEventListener("offline", refresh);

  console.info("[PWA] Outbox UI en modo:", getSyncMode());
}