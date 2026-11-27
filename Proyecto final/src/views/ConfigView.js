import loadTemplate from "../utils/templateLoader.js";
import { logout, getCurrentUser } from "../services/authService.js";
import { getInstallHelp, isStandalone } from "../utils/installPrompt.js";
import { REFRESH_VIEW_EVENT } from "../router/router.js";
import { BASE_URL } from "../config.js";

function paintInstallHelp() {
  const card = document.getElementById("install-help-card");
  const summary = document.getElementById("install-help-summary");
  if (!card || !summary) return;
  card.hidden = isStandalone();
  summary.textContent = getInstallHelp();
}

/* ---------- Aviso de notificaciones bloqueadas ---------- */

let notifyTrackerBound = false;

async function paintNotifyCard() {
  const section = document.getElementById("notify-section");
  if (!section || typeof Notification === "undefined") return;
  let state;
  try {
    state = (await navigator.permissions.query({ name: "notifications" })).state;
  } catch {
    state = Notification.permission;
  }
  section.hidden = state !== "denied";

  if (notifyTrackerBound) return; // una sola escucha global para cambios de permiso
  notifyTrackerBound = true;
  try {
    const permission = await navigator.permissions.query({ name: "notifications" });
    permission.onchange = () => {
      if (document.getElementById("notify-section")) paintNotifyCard();
    };
  } catch { /* sin Permissions API: no hay cambio que escuchar */ }
}

export default async function ConfigView() {
  const html = await loadTemplate("config.html", import.meta.url);

  setTimeout(async () => {
    const configSection = document.getElementById("config-section");
    if (configSection) configSection.hidden = false;

    paintInstallHelp();
    window.addEventListener("install-state-changed", paintInstallHelp);

    await paintNotifyCard();

    // Llenar los campos de perfil con los datos del usuario autenticado.
    const user = getCurrentUser();
    if (user) {
      const nameEl = document.getElementById("nombre");
      const emailEl = document.getElementById("email");
      if (nameEl) {
        const parts = [user.first_name, user.last_name].filter(Boolean);
        nameEl.value = parts.length > 0 ? parts.join(" ") : (user.username || "");
      }
      if (emailEl && user.email) {
        emailEl.value = user.email;
      }
    }

    // Cerrar sesión: se vuelve al login standalone.
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        logout();
        window.history.replaceState({}, "", `/${BASE_URL}/login`);
        window.dispatchEvent(new CustomEvent(REFRESH_VIEW_EVENT));
      });
    }
  }, 0);

  return html;
}
