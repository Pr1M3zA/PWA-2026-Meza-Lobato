// Marca el enlace activo en el shell: header (móvil), sidebar (desktop) y footer (móvil).

import { BASE_URL } from "../config.js";

export default function renderActiveLink(pathname) {
  const path = pathname.replace(BASE_URL, "").replace(/\/index\.html$/, "") || "/";
  document.querySelectorAll("[data-link]").forEach((link) => {
    const linkPath = new URL(link.href, location.origin).pathname.replace(BASE_URL, "") || "/";
    link.classList.toggle(
      "active",
      linkPath === path || (linkPath !== "/" && path.startsWith(linkPath + "/"))
    );
  });
}