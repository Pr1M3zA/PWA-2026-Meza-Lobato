import { getCookie, setCookie, deleteCookie } from "./cookieService.js";
import ApiClient from "./apiClient.js";

const TOKEN_COOKIE = "wl.token";
const TOKEN_DAYS = 7;
const AUTH_EVENT = "wl:auth-changed";

const client = new ApiClient("https://wires-and-ladders-api.vercel.app");

let currentUser = null;

function emit(user) {
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: { user } }));
}

export function getToken() {
  return getCookie(TOKEN_COOKIE);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function getCurrentUser() {
  return currentUser;
}

export async function login(identifier, password) {
  const res = await client.post("users/login", { identifier, password });
  let body = {};
  try {
    body = await res.json();
  } catch {
  }

  if (body && typeof body === "object" && body.token) {
    setCookie(TOKEN_COOKIE, body.token, TOKEN_DAYS);
    await fetchUser();
    return currentUser;
  }

  const serverMessage =
    (body && typeof body === "object" && (body.message || body.error)) || "";
  const err = new Error(serverMessage || `HTTP ${res.status}`);
  err.status = res.status;
  err.context = "login";
  err.serverMessage = serverMessage;
  throw err;
}

export async function fetchUser() {
  const token = getToken();
  if (!token) {
    currentUser = null;
    emit(null);
    return null;
  }
  const res = await client.get("users/user", token);
  if (!res.ok) {
    if (res.status === 401) {
      logout();
    }
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  currentUser = json?.userRow?.[0] ?? null;
  emit(currentUser);
  return currentUser;
}

export function logout() {
  deleteCookie(TOKEN_COOKIE);
  currentUser = null;
  emit(null);
}

export function subscribe(fn) {
  const handler = (e) => fn(e.detail.user);
  window.addEventListener(AUTH_EVENT, handler);
  return () => window.removeEventListener(AUTH_EVENT, handler);
}

export async function initAuth() {
  if (isAuthenticated() && !currentUser) {
    try {
      await fetchUser();
    } catch {
      /* token inválido: fetchUser ya llamó a logout() */
    }
  }
}
