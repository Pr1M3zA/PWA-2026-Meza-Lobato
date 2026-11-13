import { canPromptInstall, promptInstall, isStandalone } from "./installPrompt.js";

const buttons = () => document.querySelectorAll(".install-btn");

function paint() {
  const visible = canPromptInstall() && !isStandalone();
  buttons().forEach((el) => {
    el.hidden = !visible;
  });
}

export function initInstallButton() {
  paint();

  window.addEventListener("install-state-changed", paint);

  if (window.matchMedia) {
    const standaloneMql = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = () => paint();
    if (standaloneMql.addEventListener) {
      standaloneMql.addEventListener("change", onDisplayModeChange);
    } else if (standaloneMql.addListener) {
      standaloneMql.addListener(onDisplayModeChange);
    }
  }

  buttons().forEach((el) => {
    el.addEventListener("click", async () => {
      try {
        await promptInstall();
      } catch (error) {
        console.warn("[PWA] promptInstall() falló:", error);
      } finally {
        paint();
      }
    });
  });
}
