import { getApiBaseUrl } from '../config.js';

const PUSH_BASE = `${getApiBaseUrl().replace(/\/+$/, '')}/push`;

export function supportsPush() {
  return 'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;
}

export async function getSubscription() {
  if (!('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

async function readResponse(response) {
  if (response.ok) return response.json().catch(() => ({}));
  const body = await response.json().catch(() => ({}));
  const error = new Error(body.message || `Error del servidor (${response.status}).`);
  error.status = response.status;
  throw error;
}

async function getPublicKey() {
  const response = await fetch(`${PUSH_BASE}/public-key`, { cache: 'no-store' });
  const body = await readResponse(response);
  if (!body.publicKey) throw new Error('El backend no entregó la llave pública VAPID.');
  return body.publicKey;
}

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

function hasSameApplicationKey(subscription, expectedKey) {
  const current = subscription?.options?.applicationServerKey;
  if (!current) return false;
  const bytes = new Uint8Array(current);
  return bytes.length === expectedKey.length &&
    bytes.every((byte, index) => byte === expectedKey[index]);
}

function subscriptionJson(subscription) {
  return typeof subscription.toJSON === 'function'
    ? subscription.toJSON()
    : subscription;
}

async function sendSubscription(token, subscription) {
  const response = await fetch(`${PUSH_BASE}/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: token,
    },
    body: JSON.stringify(subscriptionJson(subscription)),
    cache: 'no-store',
  });
  return readResponse(response);
}

async function removeSubscriptionFromBackend(token, endpoint) {
  const response = await fetch(`${PUSH_BASE}/subscriptions`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      authorization: token,
    },
    body: JSON.stringify({ endpoint }),
    cache: 'no-store',
  });
  return readResponse(response);
}

export async function subscribeToPush(token) {
  if (!token) throw new Error('Inicia sesión para activar las notificaciones push.');
  if (!supportsPush()) throw new Error('Este navegador no admite notificaciones push.');

  const registration = await navigator.serviceWorker.ready;
  const applicationKey = urlBase64ToUint8Array(await getPublicKey());
  let subscription = await registration.pushManager.getSubscription();

  if (subscription && !hasSameApplicationKey(subscription, applicationKey)) {
    await removeSubscriptionFromBackend(token, subscription.endpoint).catch((error) => {
      console.warn('[PWA] No se pudo retirar la suscripción VAPID anterior:', error.message);
    });
    await subscription.unsubscribe();
    subscription = null;
  }

  subscription ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationKey,
  });

  await sendSubscription(token, subscription);
  return subscription;
}

export async function unsubscribeFromPush(token) {
  const subscription = await getSubscription();
  if (!subscription) return false;

  try {
    if (token) await removeSubscriptionFromBackend(token, subscription.endpoint);
  } catch (error) {
    // Se desactiva en el navegador aunque el backend esté temporalmente fuera de línea.
    console.warn('[PWA] No se pudo borrar la suscripción del backend:', error.message);
  }

  return subscription.unsubscribe();
}

// Reenvía una suscripción existente al iniciar sesión/abrir la app; no pide permiso nuevo. 
export async function syncSubscription(token) {
  if (!token || !supportsPush() || Notification.permission !== 'granted') return null;

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) return null;

  const applicationKey = urlBase64ToUint8Array(await getPublicKey());
  if (!hasSameApplicationKey(subscription, applicationKey)) {
    await removeSubscriptionFromBackend(token, subscription.endpoint).catch((error) => {
      console.warn('[PWA] No se pudo retirar la suscripción VAPID anterior:', error.message);
    });
    await subscription.unsubscribe();
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationKey,
    });
  }

  await sendSubscription(token, subscription);
  return subscription;
}

// Desvincula el dispositivo de la cuenta al cerrar sesión, conservando el permiso local.
export async function detachPushSubscription(token) {
  if (!token || !supportsPush()) return false;
  const subscription = await getSubscription();
  if (!subscription) return false;
  await removeSubscriptionFromBackend(token, subscription.endpoint);
  return true;
}
