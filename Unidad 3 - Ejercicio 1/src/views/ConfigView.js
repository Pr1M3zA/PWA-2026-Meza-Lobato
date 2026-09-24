import loadTemplate from "../utils/templateLoader.js";
import { isAuthenticated, login, logout, getCurrentUser } from "../services/authService.js";
import { getCookie } from "../services/cookieService.js";
import { getErrorMessage } from "../utils/errorMessage.js";
import { importWithRetry } from "../utils/moduleLoader.js";
import { addLog, getAllLogs, getLogsByAction, deleteLog } from "../services/dbService.js";
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
          window.dispatchEvent(new CustomEvent(REFRESH_VIEW_EVENT));
        }
      });
    });

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

    // --- Log de llamadas a la API (IndexedDB) ---
    initLogSection();
  }, 0);

  return html;
}

function initLogSection() {
  const logSection = document.getElementById("log-form");
  if (!logSection) return;
  if (logSection.dataset.initialized === "1") return;
  logSection.dataset.initialized = "1";

  const errorEl = document.getElementById("log-error");
  const listEl = document.getElementById("log-list");
  const emptyEl = document.getElementById("log-empty");
  const filterEl = document.getElementById("log-action-filter");

  const showError = (err) => {
    const msg = getErrorMessage(err);
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    }
    console.warn("[ConfigView] log error:", err);
  };

  const clearError = () => {
    if (errorEl) errorEl.hidden = true;
  };

  const currentUser = getCurrentUser();

  function escapeHtml(value) {
    return String(value ?? "").replace(/[<>&"]/g, (c) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]
    );
  }

  function renderLogs(logs) {
    if (!listEl) return;
    if (!logs || logs.length === 0) {
      listEl.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    listEl.innerHTML = logs
      .slice()
      .sort((a, b) => (b.dateTime ?? 0) - (a.dateTime ?? 0))
      .map((log) => {
        const ts = log.dateTime ? new Date(log.dateTime).toLocaleString() : "—";
        const user = log.user || "Invitado";
        const action = escapeHtml(log.action || "—");
        const description = log.description
          ? `<span class="log-item__desc">${escapeHtml(log.description)}</span>`
          : "";
        return `
          <li class="log-item" data-id="${log.id}">
            <div class="log-item__info">
              <span class="log-item__path">${action}</span>
              <span class="log-item__meta">${ts} · ${escapeHtml(user)}</span>
              ${description}
            </div>
            <button class="btn-icon" type="button" data-delete-log="${log.id}" aria-label="Eliminar registro">Eliminar</button>
          </li>
        `;
      })
      .join("");
  }

  async function refreshLogs(action = "") {
    try {
      const logs = action
        ? await getLogsByAction(action)
        : await getAllLogs();
      renderLogs(logs);
    } catch (err) {
      showError(err);
      if (listEl) listEl.innerHTML = "";
      if (emptyEl) emptyEl.hidden = true;
    }
  }

  refreshLogs("");

  logSection.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();

    const action = document.getElementById("log-action").value.trim();
    const description = document.getElementById("log-description").value.trim();
    const user = currentUser?.username || currentUser?.email || "Invitado";

    if (!action) {
      showError(Object.assign(new Error("La acción es obligatoria"), { context: undefined }));
      const actionInput = document.getElementById("log-action");
      if (actionInput) actionInput.focus();
      return;
    }

    const record = { dateTime: Date.now(), user, action, description };

    try {
      await addLog(record);
      logSection.reset();
      await refreshLogs(filterEl?.value || "");
    } catch (err) {
      showError(err);
    }
  });

  if (filterEl) {
    filterEl.addEventListener("change", () => {
      clearError();
      refreshLogs(filterEl.value);
    });
  }

  if (listEl) {
    listEl.addEventListener("click", async (event) => {
      const btn = event.target.closest("[data-delete-log]");
      if (!btn) return;
      const id = Number(btn.dataset.deleteLog);
      clearError();
      try {
        await deleteLog(id);
        await refreshLogs(filterEl?.value || "");
      } catch (err) {
        showError(err);
      }
    });
  }

}
