const badges = () => document.querySelectorAll("#connection-status, .connection-status");

function paint() {
  const elements = badges();
  if (!elements.length) return;

  const online = navigator.onLine;
  elements.forEach((el) => {
    el.textContent = "";
    el.setAttribute("title", online ? "Conexión: En línea" : "Conexión: Sin conexión");
    el.setAttribute("aria-label", online ? "Estado de conexión: En línea" : "Estado de conexión: Sin conexión");
    el.classList.toggle("is-offline", !online);
  });
}

export function initConnectionStatus() {
  paint();
  window.addEventListener("online", paint);
  window.addEventListener("offline", paint);
}
