import Router from "./router/router.js";
import { getApiBaseUrl } from "./config.js";
import { initTheme } from "./services/themeService.js";
import { initAuth } from "./services/authService.js";
import { initActivityLogger } from "./services/activityLogger.js";
import mountUserShell from "./components/UserShell.js";
import HomeView from "./views/HomeView.js";
import EditView from "./views/EditView.js";
import AreasConocimientoView from "./views/AreasConocimientoView.js";
import DisciplinasView from "./views/DisciplinasView.js";
import TemasView from "./views/TemasView.js";
import SubtemasView from "./views/SubtemasView.js";
import PreguntasView from "./views/PreguntasView.js";
import TablerosView from "./views/TablerosView.js";
import GruposView from "./views/GruposView.js";
import ConfigView from "./views/ConfigView.js";
import AboutView from "./views/AboutView.js";
import TileDetailView from "./views/TileDetailView.js";
import ContactView from "./views/ContactView.js";
import { registerServiceWorker } from "./utils/registerSW.js";
import ServiceWorkerView from "./views/ServiceWorkerView.js";

const routes = [
  { path: "/", view: HomeView },
  { path: "/editar", view: EditView },
  { path: "/editar/preguntas", view: AreasConocimientoView },
  { path: "/editar/disciplinas/:idka", view: DisciplinasView },
  { path: "/editar/temas/:iddisc", view: TemasView },
  { path: "/editar/subtemas/:idtopic", view: SubtemasView },
  { path: "/editar/preguntas/:idsubtopic", view: PreguntasView },
  { path: "/editar/tableros", view: TablerosView },
  { path: "/editar/grupos", view: GruposView },
  { path: "/configuracion", view: ConfigView },
  { path: "/acerca", view: AboutView },
  { path: "/contacto", view: ContactView },
  { path: "/tile/:id", view: TileDetailView },
  { path: "/configuracion/service-worker", view: ServiceWorkerView },
];

const app = document.getElementById("app");
const router = new Router(routes, app);

getApiBaseUrl();
await initAuth();
initActivityLogger();
mountUserShell();
initTheme();

router.init();

if (document.readyState === "complete") {
  registerServiceWorker();
} else {
  window.addEventListener("load", () => {
    registerServiceWorker();
  }, { once: true });
}
