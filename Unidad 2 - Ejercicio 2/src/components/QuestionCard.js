const ANSWER_COLORS = { 1: "blue", 2: "red", 3: "green", 4: "yellow"};

export default function QuestionCard(question) {
  const { generation, theme, information } = question;
  const answers = [
    { letter: "A", color: "blue", text: question.answer_1 },
    { letter: "B", color: "red", text: question.answer_2 },
    { letter: "C", color: "green", text: question.answer_3 },
    { letter: "D", color: "yellow", text: question.answer_4 },
  ];

  const items = answers
    .map(({ letter, color, text }) => `
      <li class="answer-item answer-${color}">
        <span class="answer-letter">${letter}</span>
        <span class="answer-text">${text}</span>
      </li>`)
    .join("");

  return `
    <article class="card question-card">
      <div class="question-chips">
        <span class="item-tag">${theme}</span>
        <span class="item-tag">Generación ${generation}</span>
      </div>
      <p class="question-info">${information}</p>
      <h3 class="question-text">${question.question}</h3>
      <ul class="answer-list">
        ${items}
      </ul>
    </article>
  `;
}
