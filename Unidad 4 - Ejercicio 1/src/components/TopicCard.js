export default function TopicCard(topic, disciplineColor, levelLabel, canEdit) {
  const { id, description, details, tot_subtopics } = topic;
  const subtemasCount = tot_subtopics ?? 0;
  const hasSubtopics = subtemasCount > 0;
  const editable = canEdit !== false;

  const deleteDisabled = !editable || hasSubtopics;
  const deleteDisabledAttr = deleteDisabled ? "disabled" : "";
  const deleteTitle = !editable
    ? "No puedes eliminar este tema"
    : hasSubtopics
    ? "No se puede eliminar: tiene subtemas"
    : "Eliminar";

  const editDisabledAttr = editable ? "" : "disabled";
  const editTitle = editable ? "Editar" : "No puedes editar este tema";

  return `
    <li class="topic-item">
      <article class="topic-card">
        <span class="topic-bar" style="background: ${disciplineColor}"></span>
        <header class="topic-header">
          <span class="topic-level">${levelLabel}</span>
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
          <h3 class="topic-name">${description}</h3>
          <p class="topic-details">${details ?? ""}</p>
        </div>
        <div class="topic-footer">
          <a class="topic-link" href="/editar/subtemas/${id}" data-link>Ver Subtemas ›</a>
          <span class="topic-count">${subtemasCount} subtemas</span>
        </div>
      </article>
    </li>
  `;
}
