export function breadcrumbHTML(segments) {
  if (!segments || segments.length === 0) return "";
  return `<nav class="breadcrumb" aria-label="Navegación">${segments
    .map((s, i) => {
      const isLast = i === segments.length - 1;
      const sep = isLast
        ? ""
        : '<span class="breadcrumb-sep" aria-hidden="true">›</span>';
      const inner =
        isLast || !s.href
          ? `<span class="breadcrumb-current">${s.label}</span>`
          : `<a class="breadcrumb-link" href="${s.href}" data-link>${s.label}</a>`;
      return `${inner}${sep}`;
    })
    .join("")}</nav>`;
}
