// Marca el enlace activo en el shell: header (móvil), sidebar (desktop) y footer (móvil).

import { BASE_URL } from "../config.js";

// Recorta el prefijo base de una ruta. `location.pathname` viene decodificado
// y BASE_URL viene codificada, así que se comparan ambas variantes.
function stripBase(pathname) {
  const bases = [BASE_URL, encodeURI(BASE_URL), decodeURI(BASE_URL)];
  for (const base of bases) {
    if (base && pathname.includes(base)) {
      return pathname.slice(pathname.indexOf(base) + base.length);
    }
  }
  return pathname;
}

export default function renderActiveLink(pathname) {
  const path = stripBase(pathname).replace(/\/index\.html$/, "").replace(/\/+$/, "") || "/";
  document.querySelectorAll("[data-link]").forEach((link) => {
    const linkPath = stripBase(new URL(link.href, location.origin).pathname)
      .replace(/\/index\.html$/, "")
      .replace(/\/+$/, "") || "/";
    link.classList.toggle(
      "active",
      linkPath === path || (linkPath !== "/" && path.startsWith(linkPath + "/"))
    );
  });
}