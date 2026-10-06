import { importWithRetry } from "../utils/moduleLoader.js";
import { getErrorMessage } from "../utils/errorMessage.js";

// Modal de duplicado de tableros: pide nombre y descripción nuevos para el
// tablero origen y llama a POST game/board → SP_DUPLICATE_BOARD.
// Los dos campos son obligatorios: el procedimiento aborta si alguno viene vacío.

const MODAL_ID = "duplicate-board-modal";

export function duplicateBoardModalHTML() {
  return `
    <div class="modal-backdrop" id="${MODAL_ID}" hidden>
      <article class="modal-card" role="dialog" aria-modal="true" aria-labelledby="dup-board-title">
        <button type="button" class="modal-close" data-modal-action="close" aria-label="Cerrar">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
        <p class="modal-section" data-dup-origin hidden></p>
        <h2 class="modal-card__title" id="dup-board-title">Duplicar tablero</h2>

        <div class="form-field">
          <label class="form-label" for="dup-board-name">Nombre del tablero</label>
          <input id="dup-board-name" class="form-input" type="text" autocomplete="off" maxlength="30" />
        </div>

        <div class="form-field">
          <label class="form-label" for="dup-board-description">Descripción</label>
          <textarea id="dup-board-description" class="form-textarea" rows="3"></textarea>
        </div>

        <p id="dup-board-error" class="modal-error" hidden></p>

        <div class="modal-actions">
          <button type="button" class="modal-btn modal-btn-secondary" data-modal-action="cancel">Cancelar</button>
          <button type="button" class="modal-btn modal-btn-primary" data-modal-action="save">Duplicar</button>
        </div>
      </article>
    </div>
  `;
}

export async function setupDuplicateBoardModal({ onAfterSave } = {}) {
  const modalEl = document.getElementById(MODAL_ID);
  if (!modalEl) return null;

  const originEl = modalEl.querySelector("[data-dup-origin]");
  const nameInput = modalEl.querySelector("#dup-board-name");
  const descInput = modalEl.querySelector("#dup-board-description");
  const errorEl = modalEl.querySelector("#dup-board-error");
  const closeBtn = modalEl.querySelector('[data-modal-action="close"]');
  const cancelBtn = modalEl.querySelector('[data-modal-action="cancel"]');
  const saveBtn = modalEl.querySelector('[data-modal-action="save"]');

  let currentBoardId = null;

  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function open(boardId, boardName) {
    clearError();
    currentBoardId = boardId;
    originEl.textContent = boardName ? `Origen: ${boardName}` : "";
    originEl.hidden = !boardName;
    nameInput.value = "";
    descInput.value = "";
    modalEl.hidden = false;
    nameInput.focus();
  }

  function close() {
    modalEl.hidden = true;
    currentBoardId = null;
    clearError();
  }

  async function handleSave() {
    clearError();
    const boardName = nameInput.value.trim();
    const boardDescription = descInput.value.trim();

    if (!boardName) {
      showError("El nombre del tablero es obligatorio.");
      nameInput.focus();
      return;
    }
    if (!boardDescription) {
      showError("La descripción del tablero es obligatoria.");
      descInput.focus();
      return;
    }

    saveBtn.disabled = true;
    try {
      const { default: BoardsService } = await importWithRetry(
        new URL("../services/boardsService.js", import.meta.url).href
      );
      const service = new BoardsService();
      await service.duplicateBoard(currentBoardId, boardName, boardDescription);
      close();
      if (typeof onAfterSave === "function") onAfterSave();
    } catch (e) {
      showError(getErrorMessage(e));
    } finally {
      saveBtn.disabled = false;
    }
  }

  function onKeydown(e) {
    if (e.key === "Escape" && !modalEl.hidden) {
      e.stopPropagation();
      close();
    }
  }

  function onBackdropClick(e) {
    if (e.target === modalEl) close();
  }

  closeBtn.addEventListener("click", close);
  cancelBtn.addEventListener("click", close);
  saveBtn.addEventListener("click", handleSave);
  modalEl.addEventListener("click", onBackdropClick);
  document.addEventListener("keydown", onKeydown);

  return { open, close };
}