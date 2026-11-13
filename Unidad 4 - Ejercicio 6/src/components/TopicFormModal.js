import { getErrorMessage } from "../utils/errorMessage.js";
import { queueTopic } from "../utils/backgroundSync.js";

const MODAL_ID = "topic-form-modal";

function levelChipsHTML(levels, selectedId) {
  return levels
    .map((lvl) => {
      const isActive = String(lvl.id) === String(selectedId);
      return `
        <button type="button"
                class="level-badge${isActive ? " is-active" : ""}"
                data-level-id="${lvl.id}"
                aria-pressed="${isActive}">
          ${lvl.description}
        </button>
      `;
    })
    .join("");
}

export function topicFormModalHTML(levels, selectedLevelId, areaDescription, disciplineDescription) {
  const breadcrumb = `${areaDescription ?? "Área"} › ${disciplineDescription ?? "Disciplina"}`;
  return `
    <div class="modal-backdrop" id="${MODAL_ID}" hidden>
      <article class="modal-card" role="dialog" aria-modal="true" aria-labelledby="topic-form-title">
        <button type="button" class="modal-close" data-modal-action="close" aria-label="Cerrar">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
        <p class="modal-section">${breadcrumb}</p>
        <h2 class="modal-card__title" id="topic-form-title">Agregar tema</h2>

        <div class="form-field">
          <label class="form-label">Grado</label>
          <div class="level-filter" id="modal-level-filter" role="group">${levelChipsHTML(levels, selectedLevelId)}</div>
        </div>

        <div class="form-field">
          <label class="form-label" for="modal-topic-name">Nombre del tema</label>
          <input id="modal-topic-name" class="form-input" type="text" autocomplete="off" />
        </div>

        <div class="form-field">
          <label class="form-label" for="modal-topic-details">Breve descripción</label>
          <textarea id="modal-topic-details" class="form-textarea" rows="3"></textarea>
        </div>

        <p id="modal-form-notice" class="modal-notice" hidden></p>
        <p id="modal-form-error" class="modal-error" hidden></p>

        <div class="modal-actions">
          <button type="button" class="modal-btn modal-btn-secondary" data-modal-action="cancel">Cancelar</button>
          <button type="button" class="modal-btn modal-btn-primary" data-modal-action="save">Guardar</button>
        </div>
      </article>
    </div>
  `;
}

export async function setupTopicModal({ levels, currentLevelId, iddisc, onAfterSave }) {
  const modalEl = document.getElementById(MODAL_ID);
  if (!modalEl) return null;

  const titleEl = modalEl.querySelector("#topic-form-title");
  const filterEl = modalEl.querySelector("#modal-level-filter");
  const nameInput = modalEl.querySelector("#modal-topic-name");
  const detailsInput = modalEl.querySelector("#modal-topic-details");
  const noticeEl = modalEl.querySelector("#modal-form-notice");
  const errorEl = modalEl.querySelector("#modal-form-error");
  const closeBtn = modalEl.querySelector('[data-modal-action="close"]');
  const cancelBtn = modalEl.querySelector('[data-modal-action="cancel"]');
  const saveBtn = modalEl.querySelector('[data-modal-action="save"]');

  let mode = "add";
  let currentTopicId = null;

  function selectedLevelId() {
    const active = filterEl.querySelector(".level-badge.is-active");
    return active ? active.dataset.levelId : null;
  }

  function setSelectedLevel(id) {
    filterEl.querySelectorAll(".level-badge").forEach((b) => {
      const isActive = String(b.dataset.levelId) === String(id);
      b.classList.toggle("is-active", isActive);
      b.setAttribute("aria-pressed", String(isActive));
    });
  }

  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }

  function clearNotice() {
    noticeEl.hidden = true;
    noticeEl.textContent = "";
  }

  function showError(msg) {
    clearNotice();
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function showNotice(msg) {
    clearError();
    noticeEl.textContent = msg;
    noticeEl.hidden = false;
  }

  function queuedNotice(syncMode) {
    if (!navigator.onLine) {
      return "Guardado sin conexión. Se enviará al recuperar la señal.";
    }
    return syncMode === "background-sync"
      ? "Guardado. Se enviará en segundo plano."
      : "Guardado. Enviando al servidor…";
  }

  function openModal() {
    clearError();
    clearNotice();
    modalEl.hidden = false;
    nameInput.focus();
  }

  function closeModal() {
    modalEl.hidden = true;
    clearError();
    clearNotice();
  }

  function openAdd(opts = {}) {
    mode = "add";
    currentTopicId = null;
    titleEl.textContent = "Agregar tema";
    nameInput.value = "";
    detailsInput.value = "";
    const levelId = opts.levelId ?? currentLevelId ?? levels[0]?.id;
    setSelectedLevel(levelId);
    openModal();
  }

  function openEdit(topic) {
    mode = "edit";
    currentTopicId = topic.id;
    titleEl.textContent = "Editar tema";
    nameInput.value = topic.description ?? "";
    detailsInput.value = topic.details ?? "";
    setSelectedLevel(topic.id_level ?? currentLevelId ?? levels[0]?.id);
    openModal();
  }

  filterEl.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-level-id]");
    if (!btn) return;
    setSelectedLevel(btn.dataset.levelId);
  });

  async function handleSave() {
    clearError();
    const description = nameInput.value.trim();
    const details = detailsInput.value;
    const id_level = selectedLevelId();

    if (!description) {
      showError("El nombre del tema es obligatorio.");
      nameInput.focus();
      return;
    }
    if (!id_level) {
      showError("Selecciona un grado.");
      return;
    }

    saveBtn.disabled = true;
    try {
      // Guardar primero: el item entra a la cola ANTES de cualquier intento de
      // red. Con internet el Service Worker lo vacía en segundos. Sin internet
      // se queda en el dispositivo y se envía al recuperar la señal.
      const isEdit = mode === "edit";
      const syncMode = await queueTopic({
        method: isEdit ? "PUT" : "POST",
        payload: isEdit
          ? { id: currentTopicId, id_level, description, details }
          : { id_discipline: iddisc, id_level, description, details },
        disciplineId: iddisc,
        levelId: id_level,
      });

      showNotice(queuedNotice(syncMode));
      // Breve pausa para que el usuario vea la confirmación y luego se cierra.
      await new Promise((resolve) => setTimeout(resolve, 1100));

      closeModal();
      if (typeof onAfterSave === "function") {
        onAfterSave({ pending: true, levelId: id_level, mode: syncMode, isEdit });
      }
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
