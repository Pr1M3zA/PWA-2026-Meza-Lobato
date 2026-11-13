import { getToken, isAuthenticated, subscribe as subscribeAuth } from '../services/authService.js';
import { getSubscription, supportsPush, subscribeToPush, syncSubscription, unsubscribeFromPush } from '../services/pushService.js';

let initialized = false;

async function repaint() {
  if (!supportsPush()) return 'unsupported';

  const permission = Notification.permission;
  const authenticated = isAuthenticated();
  let subscription = null;
  if (authenticated && permission === 'granted') {
    subscription = await getSubscription().catch(() => null);
  }

  document.querySelectorAll('.notify-btn').forEach((btn) => {
    btn.hidden = !authenticated;
    btn.disabled = permission === 'denied';
    const active = Boolean(subscription);
    const label = permission === 'denied'
      ? 'Notificaciones bloqueadas en la configuración del navegador'
      : active
        ? 'Desactivar notificaciones push'
        : 'Activar notificaciones push';
    btn.title = label;
    btn.setAttribute('aria-label', label);
    const icon = btn.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = active ? 'notifications_active' : 'notifications';
  });

  return permission;
}

async function handleClick(event) {
  const button = event.currentTarget;
  if (!isAuthenticated()) return;
  button.disabled = true;

  try {
    let permission = Notification.permission;
    if (permission === 'default') permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    if (await getSubscription()) {
      await unsubscribeFromPush(getToken());
    } else {
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

  subscribeAuth(({ user }) => {
    repaint();
    if (user) {
      syncSubscription(getToken()).catch((error) => {
        console.warn('[PWA] No se pudo sincronizar la suscripción push:', error.message);
      });
    }
  });

  const state = await repaint();
  if (isAuthenticated() && state === 'granted') {
    syncSubscription(getToken()).catch((error) => {
      console.warn('[PWA] No se pudo sincronizar la suscripción push:', error.message);
    });
  }
  console.info(`[PWA] Control de notificaciones push montado · permiso: ${state}`);
}
