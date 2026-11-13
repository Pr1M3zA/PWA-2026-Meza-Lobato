import { getToken, isAuthenticated, subscribe as subscribeAuth } from '../services/authService.js';
import { getSubscription, supportsPush, subscribeToPush, syncSubscription } from '../services/pushService.js';

let initialized = false;

async function repaint() {
  if (!supportsPush()) return 'unsupported';

  const permission = Notification.permission;
  const visible = isAuthenticated() && permission === 'default';

  document.querySelectorAll('.notify-btn').forEach((btn) => {
    btn.hidden = !visible;
  });

  return permission;
}

// Con permiso concedido la campanita se oculta, así que la suscripción se
// mantiene sola: se recrea si se perdió y se reenvía al backend si ya existe.
async function ensureSubscription() {
  if (!isAuthenticated() || !supportsPush() || Notification.permission !== 'granted') return;

  const token = getToken();
  if (!token) return;

  const subscription = await getSubscription().catch(() => null);
  if (subscription) {
    await syncSubscription(token);
  } else {
    await subscribeToPush(token);
  }
}

async function handleClick(event) {
  const button = event.currentTarget;
  if (!isAuthenticated()) return;
  button.disabled = true;

  try {
    let permission = Notification.permission;
    if (permission === 'default') permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    if (!(await getSubscription())) {
      await subscribeToPush(getToken());
    }
  } catch (error) {
    console.error('[PWA] No se pudo actualizar la suscripción push:', error);
  } finally {
    button.disabled = false;
    await repaint();
  }
}

export async function mountNotificationButton() {
  if (initialized) return;
  initialized = true;

  if (!supportsPush()) {
    console.info("[PWA] Notification API no disponible, no se monta el control.");
    return;
  }

  const BTN_HTML = `
    <button type="button" class="notify-btn" hidden aria-label="Activar notificaciones push"
            title="Activar notificaciones push">
      <span class="material-symbols-outlined" aria-hidden="true">notifications</span>
    </button>
  `;

  document.querySelectorAll(".shell-actions").forEach((actions) => {
    if (actions.querySelector(".notify-btn")) return;
    actions.insertAdjacentHTML("afterbegin", BTN_HTML);
    const btn = actions.querySelector(".notify-btn");
    const themeToggle = actions.querySelector(".theme-toggle");
    if (themeToggle) actions.insertBefore(btn, themeToggle);
  });

  document.querySelectorAll(".notify-btn").forEach((btn) => {
    btn.addEventListener("click", handleClick);
  });

  try {
    const permission = await navigator.permissions.query({ name: 'notifications' });
    permission.onchange = () => repaint();
  } catch {
    // Notification.permission se vuelve a consultar al abrir la app o pulsar el control.
  }

  subscribeAuth(async ({ user }) => {
    await repaint();
    if (user) {
      ensureSubscription().catch((error) => {
        console.warn('[PWA] No se pudo sincronizar la suscripción push:', error.message);
      });
    }
  });

  const state = await repaint();
  ensureSubscription().catch((error) => {
    console.warn('[PWA] No se pudo sincronizar la suscripción push:', error.message);
  });
  console.info(`[PWA] Control de notificaciones push montado · permiso: ${state}`);
}
