import { TIMEOUT_MS, MAX_RETRIES, RETRY_DELAY_MS } from "../services/apiClient.js";

const moduleCache = new Map();
let bustCounter = 0;

export async function importWithRetry(specifier) {
  if (moduleCache.has(specifier)) return moduleCache.get(specifier);
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {    const url =
      attempt === 0 ? specifier : `${specifier}${specifier.includes("?") ? "&" : "?"}retry=${++bustCounter}`;
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new DOMException("Module load timeout", "AbortError"));
      }, TIMEOUT_MS);
    });

    try {
      const mod = await Promise.race([import(url), timeoutPromise]);
      clearTimeout(timeoutId);
      moduleCache.set(specifier, mod);
      return mod;
    } catch (err) {
      clearTimeout(timeoutId);
      const isNetworkOrTimeout =
        err.name === "AbortError" || err instanceof TypeError;
      if (!isNetworkOrTimeout || attempt >= MAX_RETRIES) throw err;
      console.warn(
        `[moduleLoader] intento ${attempt + 1}/${MAX_RETRIES + 1} falló al cargar ${specifier} (${err.name}: ${err.message}), reintentando en ${RETRY_DELAY_MS}ms…`
      );
      attempt += 1;
      if (attempt <= MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }
  throw new Error("moduleLoader: se agotaron los reintentos");
}
