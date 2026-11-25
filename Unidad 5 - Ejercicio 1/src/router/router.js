import renderActiveLink from "../components/NavBar.js";
import { BASE_URL } from "../config.js";
import { isAuthenticated } from "../services/authService.js";

// Router: solo reemplaza el contenido de <main id="app">. Nunca toca el shell.

// Evento dedicado para refrescar la vista actual sin tocar la URL.
export const REFRESH_VIEW_EVENT = "wl:router-refresh";

// Latencia simulada para que el skeleton sea visible al navegar.
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Rutas accesibles solo para usuarios autenticados. Un usuario no autenticado que intente
// entrar a alguna de estas es redirigido a /login
const PROTECTED_PREFIXES = ["/editar", "/tile/"];
function isProtected(path) {
  if (path === "/") return true;
  return PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p));
}

// Ruta del login standalone (pantalla propia, fuera del App Shell).
const LOGIN_PATH = "/login";

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

  const bases = [BASE_URL, encodeURI(BASE_URL), decodeURI(BASE_URL)];
  for (const base of bases) {
    if (base && pathname.includes(base)) {
      pathname = pathname.slice(pathname.indexOf(base) + base.length);
      break;
    }
  }

  pathname = pathname.replace(/\/index\.html$/, "").replace(/\/+$/, "");
  return pathname || "/";
}

const TITLES = {
  "/": "Inicio",
  "/login": "Iniciar sesión",
  "/editar": "Editar",
  "/editar/preguntas": "Preguntas",
  "/editar/disciplinas": "Disciplinas",
  "/editar/temas": "Temas",
  "/editar/subtemas": "Subtemas",
  "/editar/tableros": "Tableros",
  "/editar/grupos": "Grupos",
  "/configuracion": "Configuración",
  "/acerca": "Acerca de",
  "/contacto": "Contacto",
  "/compartir": "Subtema compartido",
};
function titleFor(path) {
  if (TITLES[path]) return TITLES[path];
  const prefixes = Object.keys(TITLES)
    .filter((p) => p !== "/" && path.startsWith(p + "/"))
    .sort((a, b) => b.length - a.length);
  return prefixes[0] ? TITLES[prefixes[0]] : path.replace(/^\//, "");
}

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
    let target = path;
    if (typeof path === "string" && path) {
      const stripped = path.startsWith("/") ? path.slice(1) : path;
      if (!stripped.startsWith(BASE_URL)) {
        target = `/${BASE_URL}/${stripped}`;
      }
    }
    window.history.pushState({}, "", target);
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

      // Rutas protegidas sin sesión -> login standalone.
      if (isProtected(path) && !isAuthenticated()) {
        window.history.replaceState({}, "", `/${BASE_URL}${LOGIN_PATH}`);
        return this.rerender(_depth + 1);
      }

      // Con sesión activa no tiene sentido ver el login -> se va al inicio.
      if (path === LOGIN_PATH && isAuthenticated()) {
        window.history.replaceState({}, "", `/${BASE_URL}/`);
        return this.rerender(_depth + 1);
      }

      // El login se monta FUERA del App Shell (#login-root), sin header,
      // sidebar ni footer. El resto de vistas van dentro de main#app.
      if (path === LOGIN_PATH) {
        await this.renderLogin();
        return;
      }

      // Cualquier otra ruta: se sale del modo login y se restaura el shell.
      this.exitLoginMode();

      // 1. Se reemplaza el contenido actual por el skeleton
      this.root.innerHTML = this.getSkeletonHTML();
      this.lastRenderFailed = false;
      // 2. Reflejamos la ruta activa en header / footer / sidebar del shell
      renderActiveLink(path);
      // 3. Latencia simulada
      // await delay(400);

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

      const html = await this.renderView(match);
      // 5. Solo aquí se escribe contenido nuevo dentro del shell
      this.root.innerHTML = html;
      // Marca de error para que el listener "online" sepa si debe re-renderizar
      this.lastRenderFailed = this.root.querySelector(".error-state") !== null;

      document.title = `Wires&Ladders - ${titleFor(path)}`;
    } finally {
      this.rendering = false;
      if (this.pendingRender) {
        this.pendingRender = false;
        this.render();
      }
    }
  }

  // Resuelve el módulo de la vista y devuelve su HTML.
  // La vista puede venir ya resuelta (route.view) o como un import() dinámico
  // (route.load), que es como se construyen las rutas en main.js.
  async renderView(match) {
    try {
      const view = match.route.view ?? (await match.route.load()).default;
      return await view(match.params);
    } catch (error) {
      console.error("[Router] No se pudo cargar la vista: ", error);
      return this.getLoadErrorHTML();
    }
  }

  // Respaldo cuando el módulo de la vista no se puede descargar.
  getLoadErrorHTML() {
    return `
      <div class="card">
        <h2>No se pudo cargar esta sección</h2>
        <p>Revisa tu conexión e inténtalo de nuevo. Las secciones que ya visitaste
        siguen disponibles sin conexión.</p>
      </div>
    `;
  }

  // Reemplaza el render actual por uno nuevo tras un redirect.
  // Libera el flag "rendering" ANTES de delegar: si no, el render
  // recursivo se encolaría como pendiente y la vista se montaría dos veces
  // (el finally volvería a disparar render()).
  rerender(depth) {
    this.rendering = false;
    this.pendingRender = false;
    return this.render(depth);
  }

  // Monta la pantalla de login en su contenedor propio (#login-root) y
  // activa el modo "sin shell" en <body>.
  async renderLogin() {
    const loginRoot = document.getElementById("login-root");
    if (!loginRoot) return;

    const { default: LoginView } = await import("../views/LoginView.js");

    // El shell se vacía y se oculta: el login es una pantalla independiente.
    this.root.innerHTML = "";
    document.body.classList.add("is-login");

    loginRoot.innerHTML = await LoginView({
      navigate: (target) => this.navigate(target),
    });

    document.title = `Wires&Ladders - ${titleFor(LOGIN_PATH)}`;
  }

  // Restaura el App Shell al salir de la pantalla de login.
  exitLoginMode() {
    const loginRoot = document.getElementById("login-root");
    if (loginRoot) loginRoot.innerHTML = "";
    document.body.classList.remove("is-login");
  }

  init() {
    this.render();
  }
}
