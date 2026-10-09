import loadTemplate from "../utils/templateLoader.js";
import { isAuthenticated, login, logout, getCurrentUser } from "../services/authService.js";
import { getErrorMessage } from "../utils/errorMessage.js";
import { REFRESH_VIEW_EVENT } from "../router/router.js";

export default async function ConfigView() {
  const html = await loadTemplate("config.html", import.meta.url);

  setTimeout(async () => {
    const loginSection = document.getElementById("login-section");
    const configSection = document.getElementById("config-section");
    if (loginSection && configSection) {
      const authed = isAuthenticated();
      loginSection.hidden = authed;
      configSection.hidden = !authed;
    }

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

    // Cerrar sesión.
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        logout();
        window.dispatchEvent(new CustomEvent(REFRESH_VIEW_EVENT));
      });
    }

    // Iniciar sesión.
    const form = document.getElementById("login-form");
    if (form) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const errorEl = document.getElementById("login-error");
        const submitBtn = form.querySelector("button[type='submit']");
        const identifier = document.getElementById("login-id").value.trim();
        const password = document.getElementById("login-password").value;

        if (!identifier && !password) {
          errorEl.textContent = "Introduce tu usuario y contraseña";
          errorEl.hidden = false;
          return;
        }
        if (!identifier) {
          errorEl.textContent = "Introduce tu usuario o correo";
          errorEl.hidden = false;
          return;
        }
        if (!password) {
          errorEl.textContent = "Introduce tu contraseña";
          errorEl.hidden = false;
          return;
        }
        errorEl.hidden = true;
        submitBtn.disabled = true;
        submitBtn.textContent = "Entrando…";

        try {
          await login(identifier, password);
          window.dispatchEvent(new CustomEvent(REFRESH_VIEW_EVENT));
        } catch (err) {
          errorEl.textContent = getErrorMessage(err);
          errorEl.hidden = false;
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = "Entrar";
        }
      });
    }
  }, 0);

  return html;
}
