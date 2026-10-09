const ANSWER_COLORS = { 1: "blue", 2: "red", 3: "green", 4: "yellow"};

export default function QuestionCard(question, canEdit) {
  const { id, subtopic, information, question: questionText, answer_1, answer_2, answer_3, answer_4 } = question;
  const editable = canEdit !== false;

  const deleteDisabledAttr = editable ? "" : "disabled";
  const deleteTitle = editable ? "Eliminar" : "No puedes eliminar esta pregunta";
  const editDisabledAttr = editable ? "" : "disabled";
  const editTitle = editable ? "Editar" : "No puedes editar esta pregunta";

  const answers = [
    { letter: "A", color: "blue", text: answer_1 },
    { letter: "B", color: "red", text: answer_2 },
    { letter: "C", color: "green", text: answer_3 },
    { letter: "D", color: "yellow", text: answer_4 },
  ];

  const items = answers
    .map(({ letter, color, text }) => `
      <li class="answer-item answer-${color}">
        <span class="answer-letter">${letter}</span>
        <span class="answer-text">${text ?? ""}</span>
      </li>`)
    .join("");

  return `
    <article class="card question-card">
      <header class="question-header">
        <span class="item-tag">${subtopic ?? ""}</span>
        <div class="topic-actions">
          <button type="button" class="topic-icon-btn" data-action="delete-question" data-question-id="${id}" ${deleteDisabledAttr} aria-label="Eliminar pregunta" title="${deleteTitle}">
            <span class="material-symbols-outlined" aria-hidden="true">delete</span>
          </button>
          <button type="button" class="topic-icon-btn" data-action="edit-question" data-question-id="${id}" ${editDisabledAttr} aria-label="Editar pregunta" title="${editTitle}">
            <span class="material-symbols-outlined" aria-hidden="true">edit</span>
          </button>
        </div>
      </header>
      <p class="question-info">${information ?? ""}</p>
      <h3 class="question-text">${questionText ?? ""}</h3>
      <ul class="answer-list">
        ${items}
      </ul>
    </article>
  `;
}
