export default function EmptyState({
  title,
  description,
  ctaText,
  ctaId,
}) {
  return `
    <div class="empty-state" role="status">
      <span class="empty-state__icon material-symbols-outlined" aria-hidden="true">topic</span>
      <h3 class="empty-state__title">${title}</h3>
      <p class="empty-state__description">${description}</p>
      ${ctaText ? `<button type="button" class="modal-btn modal-btn-primary empty-state__cta"${ctaId ? ` id="${ctaId}"` : ""}>${ctaText}</button>` : ""}
    </div>
  `;
}
