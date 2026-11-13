import { importWithRetry } from "../utils/moduleLoader.js";
import { getErrorMessage } from "../utils/errorMessage.js";

const MODAL_ID = "subtopic-form-modal";

export function subtopicFormModalHTML(areaDescription, disciplineDescription, topicDescription) {
  const breadcrumb = `${areaDescription ?? "Área"} › ${disciplineDescription ?? "Disciplina"} › ${topicDescription ?? "Tema"}`;
  return `
    <div class="modal-backdrop" id="${MODAL_ID}" hidden>
      <article class="modal-card" role="dialog" aria-modal="true" aria-labelledby="subtopic-form-title">
        <button type="button" class="modal-close" data-modal-action="close" aria-label="Cerrar">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
        <p class="modal-section">${breadcrumb}</p>
        <h2 class="modal-card__title" id="subtopic-form-title">Agregar subtema</h2>

        <div class="form-field">
          <label class="form-label" for="modal-subtopic-name">Nombre del subtema</label>
          <input id="modal-subtopic-name" class="form-input" type="text" autocomplete="off" />
        </div>

        <div class="form-field">
          <label class="form-label" for="modal-subtopic-details">Breve descripción</label>
          <textarea id="modal-subtopic-details" class="form-textarea" rows="3"></textarea>
        </div>

        <p id="modal-form-error" class="modal-error" hidden></p>

        <div class="modal-actions">
          <button type="button" class="modal-btn modal-btn-secondary" data-modal-action="cancel">Cancelar</button>
          <button type="button" class="modal-btn modal-btn-primary" data-modal-action="save">Guardar</button>
        </div>
      </article>
    </div>
  `;
}

export async function setupSubtopicModal({ idtopic, onAfterSave }) {
  const modalEl = document.getElementById(MODAL_ID);
  if (!modalEl) return null;

  const titleEl = modalEl.querySelector("#subtopic-form-title");
  const nameInput = modalEl.querySelector("#modal-subtopic-name");
  const detailsInput = modalEl.querySelector("#modal-subtopic-details");
  const errorEl = modalEl.querySelector("#modal-form-error");
  const closeBtn = modalEl.querySelector('[data-modal-action="close"]');
  const cancelBtn = modalEl.querySelector('[data-modal-action="cancel"]');
  const saveBtn = modalEl.querySelector('[data-modal-action="save"]');

  let mode = "add";
  let currentSubtopicId = null;

  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function openModal() {
    clearError();
    modalEl.hidden = false;
    nameInput.focus();
  }

  function closeModal() {
    modalEl.hidden = true;
    clearError();
  }

  function openAdd() {
    mode = "add";
    currentSubtopicId = null;
    titleEl.textContent = "Agregar subtema";
    nameInput.value = "";
    detailsInput.value = "";
    openModal();
  }

  function openEdit(subtopic) {
    mode = "edit";
    currentSubtopicId = subtopic.id;
    titleEl.textContent = "Editar subtema";
    nameInput.value = subtopic.description ?? "";
    detailsInput.value = subtopic.details ?? "";
    openModal();
  }

  async function handleSave() {
    clearError();
    const description = nameInput.value.trim();
    const details = detailsInput.value;

    if (!description) {
      showError("El nombre del subtema es obligatorio.");
      nameInput.focus();
      return;
    }

    saveBtn.disabled = true;
    try {
      const { default: SubtopicsService } = await importWithRetry(
        new URL("../services/subtopicsService.js", import.meta.url).href
      );
      const service = new SubtopicsService();
      if (mode === "edit") {
        await service.update({ id: currentSubtopicId, id_topic: idtopic, description, details });
      } else {
        await service.create({ id_topic: idtopic, description, details });
      }
      closeModal();
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
      closeModal();
    }
  }

  function onBackdropClick(e) {
    if (e.target === modalEl) closeModal();
  }

  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);
  saveBtn.addEventListener("click", handleSave);
  modalEl.addEventListener("click", onBackdropClick);
  document.addEventListener("keydown", onKeydown);

  return { openAdd, openEdit, close: closeModal };
}
