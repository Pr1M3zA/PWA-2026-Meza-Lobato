import { getApiBaseUrl, BASE_URL } from "../config.js";
import { addToOutbox, countOutbox, getOutbox, patchOutbox, removeFromOutbox } from "../services/dbService.js";
import { getToken } from "../services/authService.js";

export const SYNC_TAG = "sync-outbox";
export const OUTBOX_CHANGED_EVENT = "outbox-changed";

const TOPICS_PATH = "education/topics";
const SENT_LOG_LIMIT = 10;

function isPermanent(status) {
  return status >= 400 && status < 500;
}

const FORCE_FALLBACK = new URLSearchParams(window.location.search).has("sin-sync");
const sentLog = [];
let retrying = false;
let onlineListenerBound = false;

export function supportsBackgroundSync() {
  return !FORCE_FALLBACK && "serviceWorker" in navigator && "SyncManager" in window;
}

export function getSyncMode() {
  return supportsBackgroundSync() ? "background-sync" : "plan-b";
}

function notifyChange() {
  window.dispatchEvent(new CustomEvent(OUTBOX_CHANGED_EVENT));
}

function routeForItem(item) {
  if (item?.disciplineId) return `editar/temas/${item.disciplineId}`;
  return "editar";
}

async function showLocalNotification({ title, body, tag, item }) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const appBase = `${window.location.origin}/${BASE_URL}/`;
    await registration.showNotification(title, {
      body,
      tag,
      // Ruta absoluta: la notificación debe verse igual desde cualquier ruta del SPA.
      icon: new URL("icons/icon-192.png", appBase).href,
      badge: new URL("icons/favicon-32.png", appBase).href,
      data: { url: appBase + routeForItem(item) },
    });
  } catch (error) {
    console.warn("[PWA] No se pudo mostrar la notificación local: ", error);
  }
}

function logSent(label, via, serverId) {
  sentLog.unshift({ time: new Date().toLocaleTimeString("es-MX"), label, via, serverId });
  sentLog.splice(SENT_LOG_LIMIT);
  notifyChange();
}

/* ---------- Alta en la cola: SIEMPRE antes de tocar la red ---------- */

function topicsUrl() {
  return `${getApiBaseUrl().replace(/\/+$/, "")}/${TOPICS_PATH}`;
}

export async function queueTopic({ method, payload, disciplineId, levelId }) {
  await addToOutbox({
    kind: method === "PUT" ? "topic-update" : "topic-create",
    url: topicsUrl(),
    method,
    token: getToken() || "NoToken",
    payload,
    label: payload.description ?? "Tema",
    disciplineId,
    levelId,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  notifyChange();
  return requestSync();
}

export async function requestSync() {
  if (supportsBackgroundSync()) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(SYNC_TAG);
      return "background-sync";
    } catch (error) {
      console.warn("[PWA] No se pudo registrar el sync, uso el plan B: ", error);
    }
  }

  // `sync.register` falló: la página asume el envío y necesita el listener.
  bindOnlineListener(true);
  await retryNow();
  return "plan-b";
}

function bindOnlineListener(force = false) {
  if (onlineListenerBound) return;
  if (!force && supportsBackgroundSync()) return;
  onlineListenerBound = true;
  window.addEventListener("online", () => {
    console.log("[PWA] Volvió la conexión, reintento la cola…");
    retryNow();
  });
}

/* ---------- Plan B: envío desde la página ---------- */

export async function retryNow() {
  if (retrying) return { sent: 0, attention: 0, remaining: await countOutbox() };

  if (!navigator.onLine) {
    const remaining = await countOutbox();
    if (remaining) notifyChange();
    return { sent: 0, attention: 0, remaining };
  }

  retrying = true;
  let sent = 0;
  let attention = 0;
  let lastSent = null;

  try {
    for (const item of await getOutbox()) {
      if (item.needsAttention) {
        attention++;
        continue;
      }

      let response;
      try {
        response = await fetch(item.url, {
          method: item.method ?? "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: item.token || "NoToken",
          },
          body: JSON.stringify(item.payload),
        });
      } catch (error) {
        await patchOutbox(item.id, {
          attempts: (item.attempts ?? 0) + 1,
          lastError: "Sin conexión",
          lastAttemptAt: new Date().toISOString(),
        });
        break;
      }

      if (!response.ok) {
        const permanent = isPermanent(response.status);
        await patchOutbox(item.id, {
          attempts: (item.attempts ?? 0) + 1,
          lastError: `HTTP ${response.status}`,
          lastAttemptAt: new Date().toISOString(),
          needsAttention: permanent,
        });
        if (permanent) {
          attention++;
          showLocalNotification({
            title: "Revisa tu cola de sincronización",
            body: `«${item.label ?? "Cambio"}» no pudo enviarse (HTTP ${response.status}). Es probable que la sesión haya expirado: vuelve a iniciar sesión.`,
            tag: "wl-outbox-atencion",
            item,
          });
        } else break;
        continue;
      }

      const data = await response.json().catch(() => ({}));
      // Sólo se borra tras la confirmación del servidor.
      await removeFromOutbox(item.id);
      logSent(item.label, "Reintento desde la página", data?.id ?? null);
      sent++;
      lastSent = item;
    }
  } finally {
    retrying = false;
  }

  if (sent > 0) {
    showLocalNotification({
      title: "Conexión restablecida ✓",
      body: sent === 1
        ? `Se envió el cambio pendiente: «${lastSent?.label ?? "Tema"}».`
        : `Se enviaron ${sent} cambios pendientes, el último: «${lastSent?.label ?? "Tema"}».`,
      tag: "wl-outbox-sincronizado",
      item: lastSent,
    });
  }

  const remaining = await countOutbox();
  notifyChange();
  return { sent, attention, remaining };
}

export async function discardOutboxItem(id) {
  await removeFromOutbox(id);
  notifyChange();
}

/* ---------- Estado para la interfaz ---------- */

export async function getOutboxState() {
  const pending = await getOutbox();
  return {
    pending,
    count: pending.length,
    attention: pending.filter((i) => i.needsAttention).length,
    mode: getSyncMode(),
    supported: supportsBackgroundSync(),
    online: navigator.onLine,
    sentLog,
  };
}

async function announceApiOrigin() {
  try {
    const registration = await navigator.serviceWorker?.ready;
    registration?.active?.postMessage({
      type: "SET_API_ORIGIN",
      origin: new URL(getApiBaseUrl()).origin,
    });
  } catch {
    /* sin SW activo todavía: se reintenta en la próxima carga */
  }
}

export function initBackgroundSync() {
  navigator.serviceWorker?.addEventListener("message", (event) => {
    const data = event.data ?? {};
    if (data.type === "OUTBOX_SENT") {
      logSent(data.label, "Background Sync (Service Worker)", data.serverId ?? null);
    }
    if (data.type === "OUTBOX_ATTENTION") {
      console.warn(`[PWA] ${data.label ?? "Elemento"} requiere atención: HTTP ${data.status}`);
      notifyChange();
    }
    if (data.type === "OUTBOX_RETRY") {
      // El SW anotó un intento fallido: el chip debe reflejar el nuevo estado.
      notifyChange();
    }
  });

  announceApiOrigin();

  if (supportsBackgroundSync()) {
    console.info("[PWA] Modo Background Sync: el envío lo lleva el Service Worker");
    return;
  }
  
  console.info("[PWA] Sin SyncManager: modo Plan B (online + al abrir + botón manual)");
  bindOnlineListener();
  retryNow();
}