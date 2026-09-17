import loadTemplate from "../utils/templateLoader.js";
import { isAuthenticated, login, logout, getCurrentUser } from "../services/authService.js";
import { getCookie } from "../services/cookieService.js";
import { getErrorMessage } from "../utils/errorMessage.js";

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
        window.dispatchEvent(new PopStateEvent("popstate"));
      });
    }

    // --- Diagnóstico de almacenamiento ---
    let tileTypeNameById = new Map();
    try {
      const { default: TilesService } = await importWithRetry(
        new URL("../services/tilesService.js", import.meta.url).href
      );
      const service = new TilesService();
      const tileTypes = await service.getTileTypes();
      tileTypeNameById = new Map(
        tileTypes.map((t) => [String(t.id), t.effect_name])
      );
    } catch {
      /*si falla, refreshDiag mostrará el id crudo. */
    }

    function refreshDiag() {
      const localEl = document.getElementById("local");
      const sessionEl = document.getElementById("session");
      const cookieEl = document.getElementById("cookie");
      const warningEl = document.getElementById("warning");
      const failed = [];

      if (localEl) {
        try {
          localEl.textContent = localStorage.getItem("theme") ?? "(vacío)";
        } catch (err) {
          console.warn("[ConfigView] localStorage no disponible:", err);
          localEl.textContent = "(no disponible)";
          failed.push("localStorage");
        }
      }
      if (sessionEl) {
        let raw = null;
        let sessionOk = true;
        try {
          raw = sessionStorage.getItem("tableros.tileTypeFilter");
        } catch (err) {
          console.warn("[ConfigView] sessionStorage no disponible:", err);
          sessionOk = false;
        }
        sessionEl.textContent = raw
          ? (tileTypeNameById.get(String(raw)) ?? raw)
          : (sessionOk ? "(vacío)" : "(no disponible)");
        if (!sessionOk) failed.push("sessionStorage");
      }
      if (cookieEl) {
        const token = getCookie("wl.token");
        cookieEl.textContent = token
          ? token.length > 20
            ? `${token.slice(0, 10)}…${token.slice(-6)}`
            : token
          : "(vacío)";
      }

      if (warningEl) {
        if (failed.length > 0) {
          warningEl.textContent =
            `No se pudo acceder a ${failed.join(" y ")}. Los valores mostrados pueden no estar actualizados.`;
          warningEl.hidden = false;
        } else {
          warningEl.hidden = true;
        }
      }
    }
    refreshDiag();

    document.querySelectorAll("[data-clear]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const kind = btn.dataset.clear;
        if (kind === "local") {
          try {
            localStorage.removeItem("theme");
            document.documentElement.removeAttribute("data-theme");
          } catch (err) {
            console.warn("[ConfigView] no se pudo limpiar localStorage:", err);
          }
          refreshDiag();
        } else if (kind === "session") {
          try {
            sessionStorage.removeItem("tableros.tileTypeFilter");
          } catch (err) {
            console.warn("[ConfigView] no se pudo limpiar sessionStorage:", err);
          }
          refreshDiag();
        } else if (kind === "cookie") {
          logout();
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
      });
    });

    // Iniciar sesión.
    const form = document.getElementById("login-form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const errorEl = document.getElementById("login-error");
      const submitBtn = form.querySelector("button[type='submit']");
      const identifier = document.getElementById("login-id").value.trim();
      const password = document.getElementById("login-password").value;

      if (!identifier || !password) return;
      errorEl.hidden = true;
      submitBtn.disabled = true;
      submitBtn.textContent = "Entrando…";

      try {
        await login(identifier, password);
        window.dispatchEvent(new PopStateEvent("popstate"));
      } catch (err) {
        errorEl.textContent = getErrorMessage(err);
        errorEl.hidden = false;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Entrar";
      }
    });
  }, 0);

  return html;
}
