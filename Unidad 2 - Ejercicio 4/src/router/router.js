import renderActiveLink from "../components/NavBar.js";
import { BASE_URL } from "../config.js";
import { isAuthenticated } from "../services/authService.js";

// Router: solo reemplaza el contenido de <main id="app">. Nunca toca el shell.

// Evento dedicado para refrescar la vista actual sin tocar la URL.
export const REFRESH_VIEW_EVENT = "wl:router-refresh";

// Latencia simulada para que el skeleton sea visible al navegar.
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Rutas accesibles solo para usuarios autenticados. Un usuario no autenticado que intente
// entrar a alguna de estas es redirigido a /configuracion 
const PROTECTED_PREFIXES = ["/editar", "/tile/"];
function isProtected(path) {
  if (path === "/") return true;
  return PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p));
}

// Convierte cualquier URL (con/sin origin, con/sin encoding, con/sin index.html)
// a la ruta interna consistente. Usada por el click handler y por render()
// para que ambos calculen el mismo path.
function normalizePath(href) {
  let pathname;
  try {
    pathname = new URL(href, window.location.href).pathname;
  } catch {
    pathname = href;
  }
  return pathname.replace(BASE_URL, "").replace(/\/index\.html$/, "") || "/";
}

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
    this.lastRenderFailed = false;
    this.rendering = false;
    this.pendingRender = false;
    window.addEventListener("popstate", () => this.render());
    window.addEventListener(REFRESH_VIEW_EVENT, () => this.render());
    // Al recuperar la conexión, re-ejecuta la vista
    window.addEventListener("online", () => {
      if (this.lastRenderFailed) this.render();
    });

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

  async render(_depth = 0) {
    // Evita loops infinitos cuando el redirect de rutas protegidas rebota.
    if (_depth > 5) {
      console.error("[Router] demasiados redirects, abortando render");
      return;
    }

    // Si ya hay un render en vuelo, encola el siguiente para evitar que se pisen.
    if (this.rendering) {
      this.pendingRender = true;
      return;
    }
    this.rendering = true;

    try {
      const path = normalizePath(window.location.pathname);

      if (isProtected(path) && !isAuthenticated()) {
        window.history.replaceState({}, "", `/${BASE_URL}/configuracion`);
        return this.render(_depth + 1);
      }

      // 1. Se reemplaza el contenido actual por el skeleton
      this.root.innerHTML = this.getSkeletonHTML();
      this.lastRenderFailed = false;
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
      // Marca de error para que el listener "online" sepa si debe re-renderizar
      this.lastRenderFailed = this.root.querySelector(".error-state") !== null;

      document.title = `Wires&Ladders - ${TITLES[path] ?? path.replace(/^\//, "")}`;
    } finally {
      this.rendering = false;
      if (this.pendingRender) {
        this.pendingRender = false;
        this.render();
      }
    }
  }

  init() {
    this.render();
  }
}
