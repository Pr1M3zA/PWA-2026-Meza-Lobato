function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[ch]);
}

export default function TopicCard(topic, disciplineColor, levelLabel, canEdit) {
  const { id, description, details, tot_subtopics, pending, pendingEdit } = topic;
  const subtemasCount = tot_subtopics ?? 0;
  const hasSubtopics = subtemasCount > 0;
  const inQueue = Boolean(pending);
  const editable = canEdit !== false && !inQueue;

  const deleteDisabled = !editable || hasSubtopics;
  const deleteDisabledAttr = deleteDisabled ? "disabled" : "";
  const deleteTitle = inQueue
    ? "Aún no se ha enviado al servidor"
    : !editable
      ? "No puedes eliminar este tema"
      : hasSubtopics
        ? "No se puede eliminar: tiene subtemas"
        : "Eliminar";

  const editDisabledAttr = editable ? "" : "disabled";
  const editTitle = inQueue
    ? "Aún no se ha enviado al servidor"
    : editable
      ? "Editar"
      : "No puedes editar este tema";

  const queueBadge = inQueue || pendingEdit
    ? `<span class="topic-pending-badge" title="Guardado en el dispositivo, pendiente de enviar al servidor">
         <span class="material-symbols-outlined" aria-hidden="true">schedule</span>
         ${inQueue ? "Pendiente de enviar" : "Cambio pendiente"}
       </span>`
    : "";

  const footer = inQueue
    ? `<span class="topic-link topic-link--disabled">Se enviará al recuperar la conexión</span>`
    : `<a class="topic-link" href="/editar/subtemas/${id}" data-link>Ver Subtemas ›</a>`;

  const levelBadge = escapeHTML(levelLabel);
  const name = escapeHTML(description);
  const body = escapeHTML(details ?? "");

  return `
    <li class="topic-item${inQueue ? " topic-item--pending" : ""}">
      <article class="topic-card">
        <span class="topic-bar" style="background: ${disciplineColor}"></span>
        <header class="topic-header">
          <span class="topic-level">${levelBadge}</span>
          <div class="topic-actions">
            <button type="button" class="topic-icon-btn" data-action="delete-topic" data-topic-id="${id}" ${deleteDisabledAttr} aria-label="Eliminar tema" title="${deleteTitle}">
              <span class="material-symbols-outlined" aria-hidden="true">delete</span>
            </button>
            <button type="button" class="topic-icon-btn" data-action="edit-topic" data-topic-id="${id}" ${editDisabledAttr} aria-label="Editar tema" title="${editTitle}">
              <span class="material-symbols-outlined" aria-hidden="true">edit</span>
            </button>
          </div>
        </header>
        <div class="topic-body">
          <h3 class="topic-name">${name}</h3>
          <p class="topic-details">${body}</p>
          ${queueBadge}
        </div>
        <div class="topic-footer">
          ${footer}
          <span class="topic-count">${subtemasCount} subtemas</span>
        </div>
      </article>
    </li>
  `;
}