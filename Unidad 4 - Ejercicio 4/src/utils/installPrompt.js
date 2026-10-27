let deferredPrompt = null;

function notify(detail) {
  console.log(`[PWA] ${detail}`);
  window.dispatchEvent(new CustomEvent("install-state-changed"));
}

export function initInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    notify("beforeinstallprompt: la app es instalable");
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify("appinstalled: instalación completada");
  });
}

export function canPromptInstall() {
  return deferredPrompt !== null;
}

export async function promptInstall() {
  if (!deferredPrompt) return null;

  const promptEvent = deferredPrompt;
  deferredPrompt = null;

  promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  notify(`userChoice: ${outcome === "accepted" ? "aceptada" : "rechazada"}`);
  return outcome;
}

const INSTALLED_DISPLAY_MODES = [
  "standalone",
  "fullscreen",
  "minimal-ui",
  "window-controls-overlay",
];

export function isStandalone() {
  if (window.navigator.standalone === true) return true;
  return INSTALLED_DISPLAY_MODES.some(
    (mode) => window.matchMedia(`(display-mode: ${mode})`).matches
  );
}
