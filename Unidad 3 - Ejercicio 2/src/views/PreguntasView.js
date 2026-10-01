import { breadcrumbHTML } from "../components/Breadcrumb.js";
import loadTemplate from "../utils/templateLoader.js";
import QuestionCard from "../components/QuestionCard.js";
import { getErrorMessage } from "../utils/errorMessage.js";
import { importWithRetry } from "../utils/moduleLoader.js";
import ErrorView from "./ErrorView.js";

export default async function PreguntasView(params) {
  const idsubtopic = params?.idsubtopic;
  let questions = [];
  let errorMessage = null;
  try {
    const { default: InfoAndQuestionsService } = await importWithRetry(
      new URL("../services/infoAndQuestionsService.js", import.meta.url).href
    );
    const service = new InfoAndQuestionsService();
    questions = await service.getBySubtopic(idsubtopic);
  } catch (e) {
    errorMessage = getErrorMessage(e);
  }

  if (errorMessage) {
    return ErrorView({ message: errorMessage });
  }

  let breadcrumb;
  if (questions.length > 0) {
    const first = questions[0];
    breadcrumb = breadcrumbHTML([
      { label: "Editor de Preguntas", href: "/editar/preguntas" },
      {
        label: first.knowledge_area,
        href: first.id_knowledge_area
          ? `/editar/disciplinas/${first.id_knowledge_area}`
          : undefined,
      },
      {
        label: first.discipline,
        href: first.id_discipline
          ? `/editar/temas/${first.id_discipline}`
          : undefined,
      },
      {
        label: first.topic,
        href: first.id_topic ? `/editar/subtemas/${first.id_topic}` : undefined,
      },
      { label: first.subtopic },
    ]);
  } else {
    let subMeta = null;
    try {
      const { default: SubtopicsService } = await importWithRetry(
        new URL("../services/subtopicsService.js", import.meta.url).href
      );
      subMeta = await new SubtopicsService().getById(idsubtopic);
    } catch {}

    if (subMeta) {
      breadcrumb = breadcrumbHTML([
        { label: "Editor de Preguntas", href: "/editar/preguntas" },
        {
          label: subMeta.knowledge_area,
          href: subMeta.id_knowledge_area
            ? `/editar/disciplinas/${subMeta.id_knowledge_area}`
            : undefined,
        },
        {
          label: subMeta.discipline,
          href: subMeta.id_discipline
            ? `/editar/temas/${subMeta.id_discipline}`
            : undefined,
        },
        {
          label: subMeta.topic,
          href: subMeta.id_topic
            ? `/editar/subtemas/${subMeta.id_topic}`
            : undefined,
        },
        { label: subMeta.description },
      ]);
    } else {
      breadcrumb = breadcrumbHTML([
        { label: "Editor de Preguntas", href: "/editar/preguntas" },
        { label: "Preguntas" },
      ]);
    }
  }

  const html = await loadTemplate("preguntas.html", import.meta.url);
  return html
    .replace("{{breadcrumb}}", breadcrumb)
    .replace("{{questionCount}}", questions.length)
    .replace("{{questions}}", questions.map((q) => QuestionCard(q)).join(""));
}
