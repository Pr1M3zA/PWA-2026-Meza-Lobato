/**
 * Router — enrutador de cliente basado en la History API.
 */
export default class Router {
  constructor(routes, rootElement) {
    this.routes = routes;
    this.root = rootElement;
    // Cumple Req.9: Los botones Atrás / Adelante del navegador funcionan correctamente
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

  /**
   * Debe devolver { route, params } si alguna ruta coincide con "path",
   * o null si ninguna coincide.
   */
  // Cumple Req.4: matchRoute extendido para parámetros dinámicos
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
    const path = window.location.pathname.replace(/\/index\.html$/, "") || "/";
    const match = this.matchRoute(path);
    // Cumple Req.8: Disparo del 404 cuando match es null
    if (!match) {
      const { default: NotFoundView } = await import(
        "../views/NotFoundView.js"
      );
      this.root.innerHTML = NotFoundView();
      return;
    }

    const html = await match.route.view(match.params);
    this.root.innerHTML = html;
    document.title = `wlweb — ${path}`;
  }

  init() {
    this.render();
  }
}
