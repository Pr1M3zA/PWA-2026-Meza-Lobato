export const BASE_URL = "PWA-2026-Meza-Lobato/Unidad%203%20-%20Ejercicio%203";

export const DEFAULT_API_URL = "https://wires-and-ladders-api.vercel.app";
//export const DEFAULT_API_URL = "http://localhost:3000";
const WL_API_BASE = "WL_API_BASE";

export function getApiBaseUrl() {
  try {
    const stored = sessionStorage.getItem(WL_API_BASE);
    if (stored) return stored;
    sessionStorage.setItem(WL_API_BASE, DEFAULT_API_URL);
    return DEFAULT_API_URL;
  } catch {
    return DEFAULT_API_URL;
  }
}

export const API_BASE_URL_DEFAULT = DEFAULT_API_URL;
