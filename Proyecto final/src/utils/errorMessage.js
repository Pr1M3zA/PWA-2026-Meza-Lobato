export function getErrorMessage(e) {
  if (e.context === "login") {
    return e.serverMessage || "Contraseña incorrecta";
  }
  if (e.context === "db") {
    return "No se pudo guardar el cambio en este dispositivo. Revisa el almacenamiento del navegador y vuelve a intentarlo.";
  }

  if (e.serverMessage) {
    return e.serverMessage;
  }
  
  if (e.status) {
    return `El servidor respondió con un error (${e.status}). Por favor, inténtalo más tarde.`;
  }
  if (e.name === "AbortError") {
    return "La solicitud tardó demasiado. Por favor, inténtalo de nuevo.";
  }
  if (e instanceof TypeError) {
    return "No se pudo conectar con el servidor. Revisa tu conexión a internet.";
  }
  return "No se pudo completar la solicitud. Por favor, inténtalo de nuevo.";
}
