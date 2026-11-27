import Router from "./router/router.js";
import { getApiBaseUrl } from "./config.js";
import { initTheme } from "./services/themeService.js";
import { initAuth } from "./services/authService.js";
import { initConnectionStatus } from "./utils/cnnStatus.js";
import { initInstallPrompt } from "./utils/installPrompt.js";
import { initInstallButton } from "./utils/installButton.js";
import mountUserShell from "./components/UserShell.js";
import { registerServiceWorker } from "./utils/registerSW.js";
import { initBackgroundSync } from "./utils/backgroundSync.js";
import { mountOutboxUI } from "./utils/outboxUI.js";
import { mountNotificationButton } from "./utils/notificationButton.js";

const routes = [
  { path: "/", load: () => import("./views/HomeView.js") },
  { path: "/login", load: () => import("./views/LoginView.js") },
  { path: "/editar", load: () => import("./views/EditView.js") },
  { path: "/editar/preguntas", load: () => import("./views/AreasConocimientoView.js") },
  { path: "/editar/disciplinas/:idka", load: () => import("./views/DisciplinasView.js") },
  { path: "/editar/temas/:iddisc", load: () => import("./views/TemasView.js") },
  { path: "/editar/subtemas/:idtopic", load: () => import("./views/SubtemasView.js") },
  { path: "/editar/preguntas/:idsubtopic", load: () => import("./views/PreguntasView.js") },
  { path: "/editar/tableros", load: () => import("./views/TablerosView.js") },
  { path: "/editar/tableros/:id/editar", load: () => import("./views/BoardEditView.js") },
  { path: "/editar/grupos", load: () => import("./views/GruposView.js") },
  // GroupDetailsView exporta dos vistas con nombre (sin default export):
  // se envuelve el import() para normalizar la forma { default }.
  {
    path: "/editar/grupos/:id/integrantes",
    load: () => import("./views/GroupDetailsView.js").then((m) => ({ default: m.GroupParticipantsView })),
  },
  {
    path: "/editar/grupos/:id/subtemas",
    load: () => import("./views/GroupDetailsView.js").then((m) => ({ default: m.GroupSubtopicsView })),
  },
  { path: "/configuracion", load: () => import("./views/ConfigView.js") },
  { path: "/acerca", load: () => import("./views/AboutView.js") },
  { path: "/contacto", load: () => import("./views/ContactView.js") },
  { path: "/tile/:id", load: () => import("./views/TileDetailView.js") },
  { path: "/compartir", load: () => import("./views/ShareView.js") },
];

const app = document.getElementById("app");
const router = new Router(routes, app);

initInstallPrompt();
initInstallButton();

getApiBaseUrl();
await initAuth();
mountUserShell();
initTheme();

router.init();
initConnectionStatus();
initBackgroundSync();
mountOutboxUI();
mountNotificationButton();

// notificationclick en el SW: si la ventana ya estaba abierta, navega sin recargar.
navigator.serviceWorker?.addEventListener("message", (event) => {
  const data = event.data ?? {};
  if (data.type === "NOTIFICATION_NAVIGATE" && data.url) {
    router.navigate(new URL(data.url, window.location.href).pathname);
  }
});

if (document.readyState === "complete") {
  registerServiceWorker();
} else {
  window.addEventListener("load", () => {
    registerServiceWorker();
  }, { once: true });
}
