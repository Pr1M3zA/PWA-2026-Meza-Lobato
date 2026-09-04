export function getErrorMessage(e) {
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
