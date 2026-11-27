import loadTemplate from "../utils/templateLoader.js";
import { login } from "../services/authService.js";
import { getErrorMessage } from "../utils/errorMessage.js";

// Vista de inicio de sesión standalone. Se monta FUERA del App Shell
// (en #login-root), por eso no comparte navegación ni estilos del shell.

function setupPasswordToggle() {
  const input = document.getElementById("login-password");
  const toggle = document.getElementById("login-toggle-password");
  if (!input || !toggle) return;

  toggle.addEventListener("click", () => {
    const visible = input.type === "text";
    input.type = visible ? "password" : "text";
    toggle.setAttribute("aria-pressed", String(!visible));
    const label = visible ? "Mostrar contraseña" : "Ocultar contraseña";
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", label);
    // Al mostrar la contraseña el foco se queda en el botón: no se pierde
    // la posición del caret dentro del campo.
    input.focus();
  });
}

export default async function LoginView({ navigate } = {}) {
  const html = await loadTemplate("login.html", import.meta.url);

  setTimeout(() => {
    const form = document.getElementById("login-form");
    if (!form) return;

    const errorEl = document.getElementById("login-error");
    const submitBtn = form.querySelector("button[type='submit']");
    const identifierInput = document.getElementById("login-id");
    const passwordInput = document.getElementById("login-password");

    setupPasswordToggle();

    function showError(message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const identifier = identifierInput.value.trim();
      const password = passwordInput.value;

      if (!identifier && !password) {
        showError("Introduce tu usuario y contraseña");
        return;
      }
      if (!identifier) {
        showError("Introduce tu usuario o correo");
        return;
      }
      if (!password) {
        showError("Introduce tu contraseña");
        return;
      }

      errorEl.hidden = true;
      submitBtn.disabled = true;
      submitBtn.textContent = "Entrando…";

      try {
        await login(identifier, password);
        // Sesión iniciada: se entra al panel con el App Shell completo.
        if (typeof navigate === "function") {
          navigate("/");
        } else {
          window.location.href = "../";
        }
      } catch (err) {
        showError(getErrorMessage(err));
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Iniciar sesión";
      }
    });
  }, 0);

  return html;
}
