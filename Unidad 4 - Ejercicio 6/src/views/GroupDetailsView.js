import loadTemplate from "../utils/templateLoader.js";
import GroupsService from "../services/groupsService.js";
import SubtopicsService from "../services/subtopicsService.js";
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

function participantCard(user) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return `
    <article class="group-detail-card group-participant-card">
      <header class="group-detail-card__header">
        <strong class="group-participant-username">${escapeHTML(user.username || "Sin username")}</strong>
        <div class="topic-actions">
          <button type="button" class="topic-icon-btn" data-action="remove-group-item" data-item-id="${Number(user.id)}"
                  aria-label="Quitar integrante del grupo" title="Quitar integrante">
            <span class="material-symbols-outlined" aria-hidden="true">delete</span>
          </button>
        </div>
      </header>
      <span>${escapeHTML(fullName || "Nombre no disponible")}</span>
      <a href="mailto:${escapeHTML(user.email)}">${escapeHTML(user.email)}</a>
    </article>
  `;
}

function subtopicCard(subtopic) {
  return `
    <article class="group-detail-card group-subtopic-card">
      <header class="group-detail-card__header">
        <h2>${escapeHTML(subtopic.description)}</h2>
        <div class="topic-actions">
          <button type="button" class="topic-icon-btn" data-action="remove-group-item" data-item-id="${Number(subtopic.id)}"
                  aria-label="Quitar subtema del grupo" title="Quitar subtema">
            <span class="material-symbols-outlined" aria-hidden="true">delete</span>
          </button>
        </div>
      </header>
      <p>${escapeHTML([subtopic.discipline, subtopic.topic].filter(Boolean).join(" · "))}</p>
    </article>
  `;
}

function detailError(message) {
  return `
    <div class="group-detail-view view-root">
      <a class="group-back-link" href="/editar/grupos" data-link>← Volver a grupos</a>
      <p class="group-error" role="alert">${escapeHTML(message)}</p>
    </div>
  `;
}

export function GroupParticipantsView(params) {
  return renderGroupDetail(params, "participants");
}

export function GroupSubtopicsView(params) {
  return renderGroupDetail(params, "subtopics");
}

async function renderGroupDetail(params, type) {
  const groupId = Number(params?.id);
  if (!Number.isSafeInteger(groupId) || groupId <= 0) {
    return detailError("El identificador de grupo no es válido.");
  }

  const groupsService = new GroupsService();
  const subtopicsService = new SubtopicsService();
  let group;
  let availableSubtopics = [];
  try {
    const groupRowsPromise = groupsService.getAll();
    const subtopicsPromise = type === "subtopics" ? subtopicsService.getByTopic(0) : Promise.resolve([]);
    const [groupRows, subtopicRows] = await Promise.all([groupRowsPromise, subtopicsPromise]);
    group = groupRows.find((item) => Number(item.id) === groupId);
    availableSubtopics = subtopicRows;
    if (!group) return detailError("No se encontró el grupo o no tienes acceso a él.");
  } catch (error) {
    return detailError(error.message);
  }

  const isParticipants = type === "participants";
  const title = isParticipants ? "Integrantes" : "Subtemas";
  const count = isParticipants ? group.participants?.length ?? 0 : group.subtopics?.length ?? 0;
  const collection = isParticipants ? group.participants ?? [] : group.subtopics ?? [];
  const collectionHTML = collection.length
    ? collection.map(isParticipants ? participantCard : subtopicCard).join("")
    : `<div class="group-empty"><h2>Aún no hay ${isParticipants ? "integrantes" : "subtemas"}</h2><p>Agrega elementos individualmente con el botón de arriba.</p></div>`;

  const html = await loadTemplate("grupo-detalle.html", import.meta.url);
  const rendered = html
    .replace(/\{\{groupTitle\}\}/g, escapeHTML(group.title))
    .replace("{{detailTitle}}", title)
    .replace(/\{\{detailTitleSingular\}\}/g, isParticipants ? "integrante" : "subtema")
    .replace("{{detailIcon}}", isParticipants ? "person_add" : "playlist_add")
    .replace("{{count}}", String(count))
    .replace("{{collection}}", collectionHTML)
    .replace("{{modalSearchLabel}}", isParticipants ? "Buscar por username o correo" : "Filtrar subtemas")
    .replace("{{modalSearchPlaceholder}}", isParticipants ? "Username o correo" : "Nombre, tema o disciplina")
    .replace("{{modalHint}}", isParticipants
      ? "Escribe al menos 2 caracteres para buscar usuarios."
      : "Busca y agrega los subtemas disponibles de uno en uno.")
    .replace("{{confirmModal}}", confirmModalHTML());

  setTimeout(() => initializeGroupDetail({
    groupId,
    type,
    initialGroup: group,
    availableSubtopics,
  }), 0);
  return rendered;
}

function initializeGroupDetail({ groupId, type, initialGroup, availableSubtopics }) {
  const root = document.getElementById("group-detail-view");
  if (!root) return;

  const isParticipants = type === "participants";
  const service = new GroupsService();
  const modal = root.querySelector("#group-detail-modal");
  const searchInput = root.querySelector("#group-detail-search");
  const options = root.querySelector("#group-detail-options");
  const collectionEl = root.querySelector("#group-detail-collection");
  const countEl = root.querySelector("#group-detail-count");
  const notice = root.querySelector("#group-detail-notice");
  const confirmCtrl = setupConfirmModal();
  let group = initialGroup;
  let searchTimer = null;
  let searchSequence = 0;

  function currentItems() {
    return isParticipants ? group.participants ?? [] : group.subtopics ?? [];
  }

  function renderCollection() {
    const items = currentItems();
    countEl.textContent = String(items.length);
    collectionEl.innerHTML = items.length
      ? items.map(isParticipants ? participantCard : subtopicCard).join("")
      : `<div class="group-empty"><h2>Aún no hay ${isParticipants ? "integrantes" : "subtemas"}</h2><p>Agrega elementos individualmente con el botón de arriba.</p></div>`;
  }

  function showNotice(message, isError = false) {
    notice.textContent = message;
    notice.hidden = !message;
    notice.classList.toggle("group-error", isError);
    notice.classList.toggle("group-notice", !isError);
  }

  function closeModal() {
    modal.hidden = true;
    searchSequence += 1;
    clearTimeout(searchTimer);
  }

  function openModal() {
    searchSequence += 1;
    clearTimeout(searchTimer);
    searchInput.value = "";
    showNotice("");
    modal.hidden = false;
    searchInput.focus();
    if (isParticipants) {
      options.innerHTML = '<p class="group-muted">Escribe al menos 2 caracteres para buscar.</p>';
    } else {
      renderAvailableSubtopics();
    }
  }

  function renderAvailableSubtopics() {
    const term = searchInput.value.trim().toLocaleLowerCase();
    const existingIds = new Set((group.subtopics ?? []).map((item) => Number(item.id)));
    const matches = availableSubtopics.filter((item) => {
      if (existingIds.has(Number(item.id))) return false;
      const searchable = [item.description, item.topic, item.discipline, item.knowledge_area]
        .filter(Boolean).join(" ").toLocaleLowerCase();
      return !term || searchable.includes(term);
    });

    options.innerHTML = matches.length
      ? matches.map((item) => `
          <article class="group-add-option">
            <div><strong>${escapeHTML(item.description)}</strong>
              <small>${escapeHTML([item.discipline, item.topic].filter(Boolean).join(" · "))}</small>
            </div>
            <button type="button" class="modal-btn modal-btn-secondary" data-add-detail-item="${Number(item.id)}">Agregar</button>
          </article>
        `).join("")
      : '<p class="group-muted">No hay subtemas disponibles que coincidan con la búsqueda.</p>';
  }

  async function searchParticipants() {
    const term = searchInput.value.trim();
    const sequence = ++searchSequence;
    if (term.length < 2) {
      options.innerHTML = '<p class="group-muted">Escribe al menos 2 caracteres para buscar.</p>';
      return;
    }

    options.innerHTML = '<p class="group-muted">Buscando usuarios…</p>';
    try {
      const users = await service.searchUsers(term);
      if (sequence !== searchSequence || modal.hidden) return;
      const memberIds = new Set((group.participants ?? []).map((user) => Number(user.id)));
      const matches = users.filter((user) => !memberIds.has(Number(user.id)));
      options.innerHTML = matches.length
        ? matches.map((user) => `
            <article class="group-add-option">
              <div><strong>${escapeHTML(user.username || "Sin username")}</strong>
                <span>${escapeHTML([user.first_name, user.last_name].filter(Boolean).join(" "))}</span>
                <small>${escapeHTML(user.email)}</small>
              </div>
              <button type="button" class="modal-btn modal-btn-secondary" data-add-detail-item="${Number(user.id)}">Agregar</button>
            </article>
          `).join("")
        : '<p class="group-muted">No se encontraron integrantes nuevos para este grupo.</p>';
    } catch (error) {
      if (sequence === searchSequence) options.innerHTML = `<p class="group-error">${escapeHTML(error.message)}</p>`;
    }
  }

  async function addItem(itemId) {
    options.innerHTML = '<p class="group-muted" role="status">Agregando…</p>';
    try {
      const result = isParticipants
        ? await service.addParticipant(groupId, itemId)
        : await service.addSubtopic(groupId, itemId);
      const groups = await service.getAll();
      const updatedGroup = groups.find((item) => Number(item.id) === groupId);
      if (!updatedGroup) throw new Error("No se pudo volver a cargar el grupo.");
      group = updatedGroup;
      renderCollection();
      showNotice(isParticipants
        ? (result.alreadyMember ? "Este usuario ya pertenece al grupo." : "Integrante agregado correctamente.")
        : (result.alreadyAssigned ? "Este subtema ya pertenece al grupo." : "Subtema agregado correctamente."));

      if (isParticipants) await searchParticipants();
      else renderAvailableSubtopics();
    } catch (error) {
      options.innerHTML = `<p class="group-error" role="alert">${escapeHTML(error.message)}</p>`;
    }
  }

  root.querySelector("#group-detail-add").addEventListener("click", openModal);
  root.querySelector("#group-detail-close").addEventListener("click", closeModal);
  root.querySelector("#group-detail-cancel").addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  searchInput.addEventListener("input", () => {
    searchSequence += 1;
    clearTimeout(searchTimer);
    options.innerHTML = '<p class="group-muted">Buscando…</p>';
    searchTimer = setTimeout(() => {
      if (isParticipants) searchParticipants();
      else renderAvailableSubtopics();
    }, 200);
  });
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") event.preventDefault();
  });
  root.addEventListener("click", async (event) => {
    const addButton = event.target.closest("[data-add-detail-item]");
    if (addButton) {
      addItem(Number(addButton.dataset.addDetailItem));
      return;
    }

    const removeButton = event.target.closest('[data-action="remove-group-item"]');
    if (!removeButton || !confirmCtrl) return;
    const itemId = Number(removeButton.dataset.itemId);
    if (!(await confirmCtrl.confirm())) return;
    try {
      if (isParticipants) await service.removeParticipant(groupId, itemId);
      else await service.removeSubtopic(groupId, itemId);
      const groups = await service.getAll();
      const updatedGroup = groups.find((item) => Number(item.id) === groupId);
      if (!updatedGroup) throw new Error("No se pudo volver a cargar el grupo.");
      group = updatedGroup;
      renderCollection();
      showNotice(isParticipants ? "Integrante quitado del grupo." : "Subtema quitado del grupo.");
      if (!isParticipants && !modal.hidden) renderAvailableSubtopics();
    } catch (error) {
      showNotice(error.message, true);
    }
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });
}
