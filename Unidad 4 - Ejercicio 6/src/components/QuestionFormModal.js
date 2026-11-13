import { importWithRetry } from "../utils/moduleLoader.js";
import { getErrorMessage } from "../utils/errorMessage.js";

const MODAL_ID = "question-form-modal";

const ANSWER_LETTERS = [
  { letter: "A", color: "blue", id: 1 },
  { letter: "B", color: "red", id: 2 },
  { letter: "C", color: "green", id: 3 },
  { letter: "D", color: "yellow", id: 4 },
];

const MAX_LENGTHS = {
  information: 150,
  question: 150,
  answer: 50,
};

function answerRowsHTML() {
  return ANSWER_LETTERS
    .map(({ letter, color, id }) => `
        <div class="answer-row" data-row="${id}">
          <label class="answer-radio-wrap" aria-label="Marcar ${letter} como correcta">
            <input type="radio" name="modal-q-ok" value="${id}" class="answer-radio" />
            <span class="answer-radio-dot" aria-hidden="true"></span>
          </label>
          <span class="answer-letter answer-letter--${color}" aria-hidden="true">${letter}</span>
          <input id="modal-q-a${id}" class="form-input answer-text-input" type="text" autocomplete="off" placeholder="Respuesta ${letter}..." maxlength="${MAX_LENGTHS.answer}" required />
        </div>
      `)
    .join("");
}

export function questionFormModalHTML(areaDescription, disciplineDescription, topicDescription, subtopicDescription) {
  const breadcrumb = `${areaDescription ?? "Área"} › ${disciplineDescription ?? "Disciplina"} › ${topicDescription ?? "Tema"} › ${subtopicDescription ?? "Subtema"}`;
  return `
    <div class="modal-backdrop" id="${MODAL_ID}" hidden>
      <article class="modal-card modal-card--wide" role="dialog" aria-modal="true" aria-labelledby="question-form-title">
        <button type="button" class="modal-close" data-modal-action="close" aria-label="Cerrar">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
        <p class="modal-section">${breadcrumb}</p>
        <h2 class="modal-card__title" id="question-form-title">Agregar pregunta</h2>

        <div class="form-field">
          <label class="form-label" for="modal-q-info">Información / contexto <span class="form-required" aria-hidden="true">*</span></label>
          <textarea id="modal-q-info" class="form-textarea" rows="2" placeholder="Texto de apoyo que deberá responder la pregunta" maxlength="${MAX_LENGTHS.information}" required></textarea>
        </div>

        <div class="form-field">
          <label class="form-label" for="modal-q-question">Pregunta <span class="form-required" aria-hidden="true">*</span></label>
          <textarea id="modal-q-question" class="form-textarea" rows="2" placeholder="Escribe la pregunta, debe responderse con la información proporcionada" maxlength="${MAX_LENGTHS.question}" required></textarea>
        </div>

        <div class="form-field">
          <span class="form-label">Opciones de respuesta <span class="form-required" aria-hidden="true">*</span></span>
          <p class="form-hint">Las 4 opciones son obligatorias. Elige cual será la respuesta correcta.</p>
          <div class="answer-options">
            ${answerRowsHTML()}
          </div>
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
  const okRadios = modalEl.querySelectorAll('input[name="modal-q-ok"]');
  const errorEl = modalEl.querySelector("#modal-form-error");
  const closeBtn = modalEl.querySelector('[data-modal-action="close"]');
  const cancelBtn = modalEl.querySelector('[data-modal-action="cancel"]');
  const saveBtn = modalEl.querySelector('[data-modal-action="save"]');

  const inputsByRow = { 1: a1Input, 2: a2Input, 3: a3Input, 4: a4Input };

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

  function setOkValue(value) {
    const target = String(value ?? 1);
    okRadios.forEach((r) => {
      r.checked = r.value === target;
    });
  }

  function getOkValue() {
    const checked = modalEl.querySelector('input[name="modal-q-ok"]:checked');
    return checked ? Number(checked.value) : null;
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
    setOkValue(1);
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
    setOkValue(q.answer_ok ?? 1);
    openModal();
  }

  async function handleSave() {
    clearError();
    const payload = {
      id_subtopic: idsubtopic,
      information: infoInput.value.trim(),
      question: questionInput.value.trim(),
      answer_1: a1Input.value,
      answer_2: a2Input.value,
      answer_3: a3Input.value,
      answer_4: a4Input.value,
    };

    if (!payload.information) {
      showError("La información / contexto es obligatoria.");
      infoInput.focus();
      return;
    }

    if (!payload.question) {
      showError("La pregunta es obligatoria.");
      questionInput.focus();
      return;
    }

    const okValue = getOkValue();
    if (okValue == null) {
      showError("Marcá cuál es la respuesta correcta.");
      a1Input.focus();
      return;
    }

    const answerInputs = [a1Input, a2Input, a3Input, a4Input];
    const emptyIdx = answerInputs.findIndex((i) => !i.value.trim());
    if (emptyIdx !== -1) {
      showError(`La opción ${ANSWER_LETTERS[emptyIdx].letter} es obligatoria.`);
      answerInputs[emptyIdx].focus();
      return;
    }

    payload.answer_ok = okValue;

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
