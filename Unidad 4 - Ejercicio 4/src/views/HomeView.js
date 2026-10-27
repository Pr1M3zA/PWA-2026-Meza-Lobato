import loadTemplate from "../utils/templateLoader.js";
import { supportsGeolocation, getCurrentPosition, describeError, getPermissionState, onPermissionChange } from "../utils/geolocation.js";

const PERMISSION_LABEL = {
  granted: "Permiso: concedido",
  denied: "Permiso: denegado",
  prompt: "Permiso: te lo pediremos al pulsar",
  unknown: "Permiso: tu navegador no permite consultarlo",
};

// Mensaje para el error 1 (permiso denegado)
const DENIED_HELP =
  "Pulsa el candado de la barra de direcciones → Permisos → Ubicación → " +
  "Permitir, y recarga la página. La app funciona igual sin esto.";

// Dónde se guarda el lugar anotado a mano. Solo en la sesión del navegador
const MANUAL_KEY = "wl.location.manual";

// Enlace al punto en OpenStreetMap
function buildMapUrl(latitude, longitude) {
  const lat = latitude.toFixed(5);
  const lon = longitude.toFixed(5);
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default async function HomeView() {
  const html = await loadTemplate("home.html", import.meta.url);

  setTimeout(() => {
    const block = document.getElementById("location-block");
    const btn = document.getElementById("location-btn");
    const permChip = document.getElementById("location-perm");
    const notice = document.getElementById("location-notice");
    const manualToggle = document.getElementById("location-manual-toggle");
    const manualBlock = document.getElementById("location-manual-block");
    const manualInput = document.getElementById("location-manual");
    const manualBtn = document.getElementById("location-manual-btn");
    if (!block || !btn || !permChip || !notice) return;
    if (!manualToggle || !manualBlock || !manualInput || !manualBtn) return;

    if (!supportsGeolocation()) {
      block.hidden = true;
      return;
    }

    // Aviso temporal: se muestra unos segundos y se cierra solo.
    let timer = null;
    function showNotice(html, { sticky = false } = {}) {
      notice.innerHTML = html;
      notice.hidden = false;
      clearTimeout(timer);
      if (!sticky) timer = setTimeout(() => (notice.hidden = true), 6000);
    }

    function readManual() {
      try {
        return sessionStorage.getItem(MANUAL_KEY) ?? "";
      } catch {
        return "";
      }
    }

    function writeManual(value) {
      try {
        if (value) sessionStorage.setItem(MANUAL_KEY, value);
        else sessionStorage.removeItem(MANUAL_KEY);
      } catch {
        /* sin sessionStorage el dato solo vive en esta pantalla */
      }
    }

    // El lugar anotado sobrevive mientras el usuario permanezca en la app.
    const saved = readManual();
    if (saved) {
      manualInput.value = saved;
      showNotice(`📍 Anotaste: ${escapeHTML(saved)}`);
    }

    function openManual() {
      manualBlock.hidden = false;
      manualInput.focus();
    }

    function tieneAnotacion() {
      return manualInput.value.trim() !== "";
    }

    // Al denegar el permiso, la alternativa manual queda a la vista.
    function paintPermission(state) {
      permChip.dataset.state = state;
      permChip.textContent = PERMISSION_LABEL[state] ?? PERMISSION_LABEL.unknown;

      if (state === "denied") {
        openManual();
        if (!tieneAnotacion()) {
          showNotice(`📍 ${describeError({ code: 1 })} ${DENIED_HELP}`, { sticky: true });
        }
      } else if (state === "granted" && !tieneAnotacion()) {
        manualBlock.hidden = true;
      }
    }

    getPermissionState().then(paintPermission);
    onPermissionChange(paintPermission);

    manualToggle.addEventListener("click", openManual);

    manualBtn.addEventListener("click", () => {
      const value = manualInput.value.trim();
      if (!value) {
        manualInput.focus();
        return;
      }
      writeManual(value);
      showNotice(`📍 Anotaste: ${escapeHTML(value)}`);
      manualBlock.hidden = true;
    });

    // --- Lectura de la ubicación ---------------------------------------------

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        const { latitude, longitude } = await getCurrentPosition();
        const lat = latitude.toFixed(5);
        const lon = longitude.toFixed(5);
        const mapUrl = buildMapUrl(latitude, longitude);
        showNotice(
          `La aplicación se abrió desde ${lat}, ${lon}. ` +
            `<a href="${escapeHTML(mapUrl)}" target="_blank" rel="noopener">Ver en el mapa</a>`
        );
      } catch (error) {
        const denied = error.code === 1;
        if (denied) openManual();
        showNotice(`📍 ${describeError(error)} ${denied ? DENIED_HELP : ""}`, {
          sticky: denied,
        });
      } finally {
        btn.disabled = false;
        // El permiso pudo cambiar durante la lectura: refrescamos el chip.
        getPermissionState().then(paintPermission);
      }
    });
  }, 0);

  return html;
}
