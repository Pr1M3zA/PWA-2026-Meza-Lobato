import loadTemplate from "../utils/templateLoader.js";
import QuestionCard from "../components/QuestionCard.js";

export default async function PreguntasView() {
  const { default: EducationService } = await import(
    "../services/educationService.js"
  );
  const service = new EducationService();

  let questions = [];
  let error = null;
  try {
    questions = await service.getAll();
  } catch (e) {
    error = e.message;
  }

  if (error) {
    return `
      <div class="card">
        <h2>Error al cargar las preguntas</h2>
        <p style="color:#b91c1c">${error}</p>
        <a href="/" data-link>← Volver al inicio</a>
      </div>
    `;
  }

  const html = await loadTemplate("preguntas.html", import.meta.url);
  return html
    .replace("{{questionCount}}", questions.length)
    .replace("{{questions}}", questions.map((q) => QuestionCard(q)).join(""));
}
