import loadTemplate from "../utils/templateLoader.js";
import QuestionCard from "../components/QuestionCard.js";
import { getErrorMessage } from "../utils/errorMessage.js";
import { importWithRetry } from "../utils/moduleLoader.js";
import ErrorView from "./ErrorView.js";

export default async function PreguntasView() {
  let questions = [];
  let errorMessage = null;
  try {
    const { default: EducationService } = await importWithRetry(
      new URL("../services/educationService.js", import.meta.url).href
    );
    const service = new EducationService();
    questions = await service.getAll();
  } catch (e) {
    errorMessage = getErrorMessage(e);
  }

  if (errorMessage) {
    return ErrorView({ message: errorMessage });
  }

  const html = await loadTemplate("preguntas.html", import.meta.url);
  return html
    .replace("{{questionCount}}", questions.length)
    .replace("{{questions}}", questions.map((q) => QuestionCard(q)).join(""));
}
