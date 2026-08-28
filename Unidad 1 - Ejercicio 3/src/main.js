// Cumple Req.1: Estructura router/, views/, services/ components/ y utils/

import Router from "./router/router.js";
import HomeView from "./views/HomeView.js";
import AboutView from "./views/AboutView.js";
import TileDetailView from "./views/TileDetailView.js";
import ContactView from "./views/ContactView.js";

const routes = [
  // Cumple Req.2: Ruta estática de listado
  { path: "/", view: HomeView },
  // Cumple Req.3: Rutas estáticas secundarias
  { path: "/acerca", view: AboutView },
  { path: "/contacto", view: ContactView },
  // Cumple Req.4: Ruta dinámica con parametro :id
  { path: "/tile/:id", view: TileDetailView },
];

const app = document.getElementById("app");
const router = new Router(routes, app);

router.init();
