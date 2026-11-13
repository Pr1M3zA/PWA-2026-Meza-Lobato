import loadTemplate from "../utils/templateLoader.js";
import GroupsService from "../services/groupsService.js";
import { confirmModalHTML, setupConfirmModal } from "../components/ConfirmModal.js";

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function groupCard(group) {
  const participantCount = group.participants?.length ?? 0;
  const subtopicCount = group.subtopics?.length ?? 0;
  const groupId = Number(group.id);
  const canDelete = participantCount === 0 && subtopicCount === 0;
  return `
    <article class="group-card group-summary-card">
      <header class="group-card__header">
        <h2>${escapeHTML(group.title)}</h2>
        <div class="topic-actions">
          <button type="button" class="topic-icon-btn" data-action="delete-group" data-group-id="${groupId}"
                  ${canDelete ? "" : "disabled"} aria-label="Eliminar grupo" title="${canDelete ? "Eliminar grupo" : "Vacía el grupo antes de eliminarlo"}">
            <span class="material-symbols-outlined" aria-hidden="true">delete</span>
          </button>
          <button type="button" class="topic-icon-btn" data-action="edit-group" data-group-id="${groupId}"
                  aria-label="Editar descripción del grupo" title="Editar descripción">
            <span class="material-symbols-outlined" aria-hidden="true">edit</span>
          </button>
        </div>
      </header>
      <nav class="group-summary-links" aria-label="Administrar ${escapeHTML(group.title)}">
        <a class="group-summary-link" href="/editar/grupos/${groupId}/integrantes" data-link>
          <span>Integrantes</span><strong>${participantCount}</strong>
        </a>
        <a class="group-summary-link" href="/editar/grupos/${groupId}/subtemas" data-link>
          <span>Temas</span><strong>${subtopicCount}</strong>
        </a>
      </nav>
    </article>
  `;
}

export default async function GruposView() {
  const html = await loadTemplate("grupos.html", import.meta.url);
  setTimeout(initializeGroupsView, 0);
  return html.replace("{{confirmModal}}", confirmModalHTML());
}

function initializeGroupsView() {
  const root = document.getElementById("groups-view");
  if (!root) return;

  const groupsList = root.querySelector("#groups-list");
  const noticeEl = root.querySelector("#groups-notice");
  const addButton = root.querySelector("#groups-add-button");
  const modal = root.querySelector("#group-form-modal");
  const form = root.querySelector("#group-form");
  const titleInput = root.querySelector("#group-title");
  const formTitle = root.querySelector("#group-form-title");
  const errorEl = root.querySelector("#group-form-error");
  const saveButton = root.querySelector("#group-save-button");
  const service = new GroupsService();
  const confirmCtrl = setupConfirmModal();
  let groups = [];
  let editingGroup = null;

  function renderGroups() {
    groupsList.innerHTML = groups.length
      ? groups.map(groupCard).join("")
      : '<div class="group-empty"><h2>Aún no tienes grupos</h2><p>Crea un grupo vacío y agrega integrantes o temas después.</p></div>';
  }

  function showNotice(message, isError = false) {
    noticeEl.textContent = message;
    noticeEl.hidden = !message;
    noticeEl.classList.toggle("group-error", isError);
    noticeEl.classList.toggle("group-notice", !isError);
  }

  function openForm(group = null) {
    editingGroup = group;
    titleInput.value = group?.title ?? "";
    formTitle.textContent = group ? "Editar descripción" : "Crear grupo";
    saveButton.textContent = group ? "Guardar cambios" : "Crear grupo";
    saveButton.disabled = false;
    errorEl.hidden = true;
    errorEl.textContent = "";
    modal.hidden = false;
    titleInput.focus();
  }

  function closeForm() {
    modal.hidden = true;
    editingGroup = null;
  }

  async function loadGroups() {
    groupsList.innerHTML = '<p class="group-loading" role="status">Cargando grupos…</p>';
    try {
      groups = await service.getAll();
      addButton.disabled = false;
      addButton.textContent = "Crear grupo";
      renderGroups();
    } catch (error) {
      groupsList.innerHTML = `<div class="group-error" role="alert">${escapeHTML(error.message)}</div>`;
    }
  }

  addButton.addEventListener("click", () => openForm());
  root.querySelector("#group-form-close").addEventListener("click", closeForm);
  root.querySelector("#group-form-cancel").addEventListener("click", closeForm);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeForm();
  });

  root.addEventListener("click", async (event) => {
    const editButton = event.target.closest('[data-action="edit-group"]');
    if (editButton) {
      const group = groups.find((item) => Number(item.id) === Number(editButton.dataset.groupId));
      if (group) openForm(group);
      return;
    }

    const deleteButton = event.target.closest('[data-action="delete-group"]');
    if (!deleteButton || deleteButton.disabled || !confirmCtrl) return;
    const group = groups.find((item) => Number(item.id) === Number(deleteButton.dataset.groupId));
    if (!group || (group.participants?.length ?? 0) > 0 || (group.subtopics?.length ?? 0) > 0) return;
    if (!(await confirmCtrl.confirm())) return;

    try {
      await service.deleteGroup(group.id);
      showNotice("Grupo eliminado.");
      await loadGroups();
    } catch (error) {
      showNotice(error.message, true);
    }
  });

  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeForm();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    if (!title) {
      errorEl.textContent = "Escribe la descripción del grupo.";
      errorEl.hidden = false;
      titleInput.focus();
      return;
    }

    saveButton.disabled = true;
    errorEl.hidden = true;
    try {
      if (editingGroup) {
        await service.update(editingGroup.id, { title });
      } else {
        await service.create({ title });
      }
      closeForm();
      await loadGroups();
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
    } finally {
      saveButton.disabled = false;
    }
  });

  loadGroups();
}
