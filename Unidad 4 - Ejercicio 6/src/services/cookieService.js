const DEFAULT_PATH = "/";

function encode(value) {
  return encodeURIComponent(value);
}

function decode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getCookie(name) {
  if (!name) return null;
  const prefix = `${encode(name)}=`;
  const parts = document.cookie ? document.cookie.split("; ") : [];
  for (const part of parts) {
    if (part.startsWith(prefix)) return decode(part.slice(prefix.length));
  }
  return null;
}

export function setCookie(name, value, days = 7) {
  if (!name) return;
  try {
    const expires = new Date(Date.now() + days * 86_400_000).toUTCString();
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${encode(name)}=${encode(value)}; expires=${expires}; path=${DEFAULT_PATH}; SameSite=Lax${secure}`;
  } catch (err) {
    console.warn("[cookieService] no se pudo escribir cookie:", err);
  }
}

export function deleteCookie(name) {
  if (!name) return;
  try {
    document.cookie = `${encode(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${DEFAULT_PATH}; SameSite=Lax`;
  } catch (err) {
    console.warn("[cookieService] no se pudo borrar cookie:", err);
  }
}
