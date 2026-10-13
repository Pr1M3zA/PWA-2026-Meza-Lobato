export default function SubtopicCard(subtopic, disciplineColor, canEdit) {
  const { id, description, details, tot_questions } = subtopic;
  const questionsCount = tot_questions ?? 0;
  const hasQuestions = questionsCount > 0;
  const editable = canEdit !== false;

  const deleteDisabled = !editable || hasQuestions;
  const deleteDisabledAttr = deleteDisabled ? "disabled" : "";
  const deleteTitle = !editable
    ? "No puedes eliminar este subtema"
    : hasQuestions
    ? "No se puede eliminar: tiene preguntas"
    : "Eliminar";

  const editDisabledAttr = editable ? "" : "disabled";
  const editTitle = editable ? "Editar" : "No puedes editar este subtema";

  return `
    <li class="topic-item">
      <article class="topic-card">
        <span class="topic-bar" style="background: ${disciplineColor}"></span>
        <header class="topic-header">
          <span class="topic-level">${questionsCount} preguntas</span>
          <div class="topic-actions">
            <button type="button" class="topic-icon-btn" data-action="delete-subtopic" data-subtopic-id="${id}" ${deleteDisabledAttr} aria-label="Eliminar subtema" title="${deleteTitle}">
              <span class="material-symbols-outlined" aria-hidden="true">delete</span>
            </button>
            <button type="button" class="topic-icon-btn" data-action="edit-subtopic" data-subtopic-id="${id}" ${editDisabledAttr} aria-label="Editar subtema" title="${editTitle}">
              <span class="material-symbols-outlined" aria-hidden="true">edit</span>
            </button>
          </div>
        </header>
        <div class="topic-body">
          <h3 class="topic-name">${description}</h3>
          <p class="topic-details">${details ?? ""}</p>
        </div>
        <div class="topic-footer">
          <a class="topic-link" href="/editar/preguntas/${id}" data-link>Ver Preguntas ›</a>
          <span class="topic-count">${questionsCount} preguntas</span>
        </div>
      </article>
    </li>
  `;
}
