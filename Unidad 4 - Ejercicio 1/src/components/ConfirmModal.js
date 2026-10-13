const MODAL_ID = "confirm-modal";

export function confirmModalHTML() {
  return `
    <div class="modal-backdrop" id="${MODAL_ID}" hidden>
      <article class="modal-card modal-card--confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        <h2 class="modal-card__title" id="confirm-modal-title">¿Seguro que quieres eliminar?</h2>
        <div class="modal-actions modal-actions--center">
          <button type="button" class="modal-btn modal-btn-secondary" data-confirm-action="cancel">Cancelar</button>
          <button type="button" class="modal-btn modal-btn-danger" data-confirm-action="ok">Eliminar</button>
        </div>
      </article>
    </div>
  `;
}

export function setupConfirmModal() {
  const modalEl = document.getElementById(MODAL_ID);
  if (!modalEl) return null;

  const cancelBtn = modalEl.querySelector('[data-confirm-action="cancel"]');
  const okBtn = modalEl.querySelector('[data-confirm-action="ok"]');
  let resolver = null;

  function close(result) {
    modalEl.hidden = true;
    if (resolver) {
      resolver(result);
      resolver = null;
    }
  }

  function onBackdropClick(e) {
    if (e.target === modalEl) close(false);
  }

  function onKeydown(e) {
    if (e.key === "Escape" && !modalEl.hidden) {
      e.stopPropagation();
      close(false);
    }
  }

  cancelBtn.addEventListener("click", () => close(false));
  modalEl.addEventListener("click", onBackdropClick);
  document.addEventListener("keydown", onKeydown);

  function confirm() {
    modalEl.hidden = false;
    return new Promise((resolve) => {
      resolver = resolve;
      okBtn.onclick = () => close(true);
      cancelBtn.onclick = () => close(false);
    });
  }

  return { confirm };
}
