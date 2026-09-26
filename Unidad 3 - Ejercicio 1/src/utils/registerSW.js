import { BASE_URL } from "../config.js";

export const SW_URL = `/${BASE_URL}/sw.js`;

export const SW_SCOPE = `/${BASE_URL}/`;

export const SW_NARROW_URL = `/${BASE_URL}/src/sw.js`;

export const SW_NARROW_SCOPE = `/${BASE_URL}/src/`;

export async function registerServiceWorker() {

  if (!("serviceWorker" in navigator)) {
    console.warn("[PWA] Este navegador no tiene soporte para service workers.")
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_URL, {
      scope: SW_SCOPE
    });
    console.log("[PWA] SW (ancho) registrado con scope:", registration.scope);
    return registration;
  } catch (error) {
    console.log("[PWA] Falló el registro del SW (ancho)", error);
    return null;
  }

}

export async function registerNarrowServiceWorker() {

  if (!("serviceWorker" in navigator)) {
    console.warn("[PWA] Este navegador no tiene soporte para service workers.")
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_NARROW_URL, {
      scope: SW_NARROW_SCOPE
    });
    console.log("[PWA] SW (estrecho) registrado con scope:", registration.scope);
    return registration;
  } catch (error) {
    console.log("[PWA] Falló el registro del SW (estrecho)", error);
    return null;
  }

}
