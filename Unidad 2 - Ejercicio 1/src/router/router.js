import renderActiveLink from "../components/NavBar.js";
import { BASE_URL } from "../config.js";

// Router: solo reemplaza el contenido de <main id="app">. Nunca toca el shell.

// Latencia simulada para que el skeleton sea visible al navegar.
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const TITLES = {
  "/": "Inicio",
  "/editar": "Editar",
  "/editar/preguntas": "Preguntas",
  "/editar/tableros": "Tableros",
  "/editar/grupos": "Grupos",
  "/configuracion": "Configuración",
  "/acerca": "Acerca de",
  "/contacto": "Contacto",
};
export default class Router {
  constructor(routes, rootElement) {
    this.routes = routes;
    this.root = rootElement;
    window.addEventListener("popstate", () => this.render());

    document.addEventListener("click", (event) => {
      const link = event.target.closest("[data-link]");
      if (!link) return;
      event.preventDefault();
      this.navigate(link.getAttribute("href"));
    });
  }

  navigate(path) {
    window.history.pushState({}, "", path);
    this.render();
  }

  // Skeleton UI mostrado mientras el router resuelve la vista (estado de carga).
  getSkeletonHTML() {
    return `
      <div class="skeleton-card">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line short"></div>
      </div>
    `;
  }

  matchRoute(path) {
    for (const route of this.routes) {
      const routeParts = route.path.split("/").filter(Boolean);
      const pathParts = path.split("/").filter(Boolean);
      if (routeParts.length !== pathParts.length) continue;
      const params = {};
      const matched = routeParts.every((segment, i) => {
        if (segment.startsWith(":")) {
          params[segment.slice(1)] = decodeURIComponent(pathParts[i]);
          return true;
        }
        return segment === pathParts[i];
      });
      if (matched) return { route, params };
    }
    return null;
  }

  async render() {
    const path = window.location.pathname.replace(BASE_URL, "").replace(/\/index\.html$/, "") || "/";

    // 1. Se reemplaza el contenido actual por el skeleton
    this.root.innerHTML = this.getSkeletonHTML();
    // 2. Reflejamos la ruta activa en header / footer / sidebar del shell
    renderActiveLink(path);
    // 3. Latencia simulada 
    await delay(400);

    const match = this.matchRoute(path);

    // 4. Resolución de la vista (404 cuando match es null)
    if (!match) {
      const { default: NotFoundView } = await import(
        "../views/NotFoundView.js"
      );
      this.root.innerHTML = await NotFoundView();
      document.title = "Wires&Ladders — 404";
      return;
    }

    const html = await match.route.view(match.params);
    // 5. Solo aquí se escribe contenido nuevo dentro del shell
    this.root.innerHTML = html;

    document.title = `Wires&Ladders - ${TITLES[path] ?? path.replace(/^\//, "")}`;
  }

  init() {
    this.render();
  }
}