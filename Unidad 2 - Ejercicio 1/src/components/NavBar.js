// Marca el enlace activo en el shell: header (móvil), sidebar (desktop) y footer (móvil).

function matches(href, path) {
  if (href === "/") return path === "/";
  if (path === href) return true;
  return path.startsWith(href + "/");
}

export default function renderActiveLink(pathname) {
  const path = pathname.replace(/\/index\.html$/, "") || "/";
  document.querySelectorAll("[data-link]").forEach((link) => {
    const href = link.getAttribute("href");
    link.classList.toggle("active", matches(href, path));
  });
}