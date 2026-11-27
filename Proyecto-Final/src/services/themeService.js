const STORAGE_KEY = "theme";
const VALID_THEMES = ["light", "dark"];
const DEFAULT_THEME = "light";

function getStoredTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return VALID_THEMES.includes(v) ? v : null;
  } catch (err) {
    console.warn("[themeService] no se pudo leer localStorage:", err);
    return null;
  }
}

function applyTheme(theme) {
  const resolved = VALID_THEMES.includes(theme) ? theme : DEFAULT_THEME;
  document.documentElement.dataset.theme = resolved;
}

function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (err) {
    console.warn("[themeService] no se pudo guardar el tema:", err);
  }
}

function getCurrentTheme() {
  return document.documentElement.dataset.theme || DEFAULT_THEME;
}

function updateToggleButtons(theme) {
  const nextLabel = theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro";
  document.querySelectorAll(".theme-toggle").forEach((btn) => {
    btn.setAttribute("aria-label", nextLabel);
    btn.setAttribute("title", nextLabel);
    btn.setAttribute("aria-pressed", String(theme === "dark"));
  });
}

export function toggleTheme() {
  const next = getCurrentTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  saveTheme(next);
  updateToggleButtons(next);
}

export function initTheme() {
  const stored = getStoredTheme() ?? DEFAULT_THEME;
  applyTheme(stored);
  updateToggleButtons(stored);

  document.querySelectorAll(".theme-toggle").forEach((btn) => {
    btn.addEventListener("click", toggleTheme);
  });

  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    if (!VALID_THEMES.includes(e.newValue)) return;
    applyTheme(e.newValue);
    updateToggleButtons(e.newValue);
  });
}
