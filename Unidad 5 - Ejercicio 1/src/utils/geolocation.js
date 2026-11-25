// Módulo de geolocalización: SOLO la API, sin HTML ni DOM.
// La vista (HomeView) se encarga de pedir la ubicación y de mostrar los mensajes.

export function supportsGeolocation() {
  return "geolocation" in navigator;
}

const READ_OPTIONS = {
  enableHighAccuracy: true, // true = GPS (preciso, más batería); false = Wi-Fi/antenas
  timeout: 10000, // milisegundos máximos de espera por la lectura
  maximumAge: 60000, // acepta una lectura guardada de hasta 60 s (responde más rápido)
};

// La API original usa callbacks (éxito, error, opciones). La envolvemos en una
// Promise para poder usar async/await en la vista.
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Nos quedamos solo con lo que usa la app y lo dejamos como objeto plano.
        const { latitude, longitude, accuracy } = position.coords;
        resolve({ latitude, longitude, accuracy });
      },
      reject, // el error llega como GeolocationPositionError
      READ_OPTIONS
    );
  });
}

// Un mensaje distinto por cada código de error de la API.
export function describeError(error) {
  switch (error.code) {
    case 1: // PERMISSION_DENIED
      return "Permiso denegado. Para volver a intentarlo, habilita la ubicación en la configuración del sitio.";
    case 2: // POSITION_UNAVAILABLE
      return "No se pudo determinar la ubicación (sin señal de GPS o de red).";
    case 3: // TIMEOUT
      return "Se agotó el tiempo de espera de la lectura.";
    default:
      return "Ocurrió un error inesperado al leer la ubicación.";
  }
}

let permissionQuery = null;

function queryPermission() {
  // Guardamos la consulta para reutilizar el mismo PermissionStatus.
  if (!permissionQuery) {
    permissionQuery = navigator.permissions.query({ name: "geolocation" });
  }
  return permissionQuery;
}

// "granted" | "denied" | "prompt" | "unknown" (navegador sin Permissions API).
export async function getPermissionState() {
  if (!navigator.permissions?.query) return "unknown";

  try {
    return (await queryPermission()).state;
  } catch (error) {
    console.warn("[PWA] No se pudo consultar el permiso: ", error);
    return "unknown";
  }
}

// Avisa cuando el usuario cambia el permiso desde el navegador.
export async function onPermissionChange(callback) {
  if (!navigator.permissions?.query) return;

  try {
    const status = await queryPermission();
    status.onchange = () => callback(status.state);
  } catch (error) {
    console.warn("[PWA] No se pudo observar el permiso: ", error);
  }
}
