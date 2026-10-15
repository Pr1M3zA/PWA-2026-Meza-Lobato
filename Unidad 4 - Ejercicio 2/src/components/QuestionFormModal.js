import { importWithRetry } from "../utils/moduleLoader.js";
import { getErrorMessage } from "../utils/errorMessage.js";

const MODAL_ID = "question-form-modal";

export function questionFormModalHTML(areaDescription, disciplineDescription, topicDescription, subtopicDescription) {
  const breadcrumb = `${areaDescription ?? "Área"} › ${disciplineDescription ?? "Disciplina"} › ${topicDescription ?? "Tema"} › ${subtopicDescription ?? "Subtema"}`;
  return `
    <div class="modal-backdrop" id="${MODAL_ID}" hidden>
      <article class="modal-card" role="dialog" aria-modal="true" aria-labelledby="question-form-title">
        <button type="button" class="modal-close" data-modal-action="close" aria-label="Cerrar">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
        <p class="modal-section">${breadcrumb}</p>
        <h2 class="modal-card__title" id="question-form-title">Agregar pregunta</h2>

        <div class="form-field">
          <label class="form-label" for="modal-q-info">Información / contexto</label>
          <textarea id="modal-q-info" class="form-textarea" rows="2"></textarea>
        </div>

        <div class="form-field">
          <label class="form-label" for="modal-q-question">Pregunta</label>
          <textarea id="modal-q-question" class="form-textarea" rows="2"></textarea>
        </div>

        <div class="form-field">
          <label class="form-label" for="modal-q-a1">Opción A</label>
          <input id="modal-q-a1" class="form-input" type="text" autocomplete="off" />
        </div>

        <div class="form-field">
          <label class="form-label" for="modal-q-a2">Opción B</label>
          <input id="modal-q-a2" class="form-input" type="text" autocomplete="off" />
        </div>

        <div class="form-field">
          <label class="form-label" for="modal-q-a3">Opción C</label>
          <input id="modal-q-a3" class="form-input" type="text" autocomplete="off" />
        </div>

        <div class="form-field">
          <label class="form-label" for="modal-q-a4">Opción D</label>
          <input id="modal-q-a4" class="form-input" type="text" autocomplete="off" />
        </div>

        <div class="form-field">
          <label class="form-label" for="modal-q-ok">Respuesta correcta</label>
          <select id="modal-q-ok" class="form-input">
            <option value="1">A</option>
            <option value="2">B</option>
            <option value="3">C</option>
            <option value="4">D</option>
          </select>
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

export async function setupQuestionModal({ idsubtopic, onAfterSave }) {
  const modalEl = document.getElementById(MODAL_ID);
  if (!modalEl) return null;

  const titleEl = modalEl.querySelector("#question-form-title");
  const infoInput = modalEl.querySelector("#modal-q-info");
  const questionInput = modalEl.querySelector("#modal-q-question");
  const a1Input = modalEl.querySelector("#modal-q-a1");
  const a2Input = modalEl.querySelector("#modal-q-a2");
  const a3Input = modalEl.querySelector("#modal-q-a3");
  const a4Input = modalEl.querySelector("#modal-q-a4");
  const okSelect = modalEl.querySelector("#modal-q-ok");
  const errorEl = modalEl.querySelector("#modal-form-error");
  const closeBtn = modalEl.querySelector('[data-modal-action="close"]');
  const cancelBtn = modalEl.querySelector('[data-modal-action="cancel"]');
  const saveBtn = modalEl.querySelector('[data-modal-action="save"]');

  let mode = "add";
  let currentQuestionId = null;

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
    questionInput.focus();
  }

  function closeModal() {
    modalEl.hidden = true;
    clearError();
  }

  function openAdd() {
    mode = "add";
    currentQuestionId = null;
    titleEl.textContent = "Agregar pregunta";
    infoInput.value = "";
    questionInput.value = "";
    a1Input.value = "";
    a2Input.value = "";
    a3Input.value = "";
    a4Input.value = "";
    okSelect.value = "1";
    openModal();
  }

  function openEdit(q) {
    mode = "edit";
    currentQuestionId = q.id;
    titleEl.textContent = "Editar pregunta";
    infoInput.value = q.information ?? "";
    questionInput.value = q.question ?? "";
    a1Input.value = q.answer_1 ?? "";
    a2Input.value = q.answer_2 ?? "";
    a3Input.value = q.answer_3 ?? "";
    a4Input.value = q.answer_4 ?? "";
    okSelect.value = String(q.answer_ok ?? 1);
    openModal();
  }

  async function handleSave() {
    clearError();
    const payload = {
      id_subtopic: idsubtopic,
      information: infoInput.value,
      question: questionInput.value.trim(),
      answer_1: a1Input.value,
      answer_2: a2Input.value,
      answer_3: a3Input.value,
      answer_4: a4Input.value,
      answer_ok: Number(okSelect.value),
    };

    if (!payload.question) {
      showError("La pregunta es obligatoria.");
      questionInput.focus();
      return;
    }
    if (![payload.answer_1, payload.answer_2, payload.answer_3, payload.answer_4].some((a) => a && a.trim())) {
      showError("Agrega al menos una opción de respuesta.");
      a1Input.focus();
      return;
    }

    saveBtn.disabled = true;
    try {
      const { default: InfoAndQuestionsService } = await importWithRetry(
        new URL("../services/infoAndQuestionsService.js", import.meta.url).href
      );
      const service = new InfoAndQuestionsService();
      if (mode === "edit") {
        await service.update({ id: currentQuestionId, ...payload });
      } else {
        await service.create(payload);
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
