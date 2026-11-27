import { breadcrumbHTML } from "../components/Breadcrumb.js";
import loadTemplate from "../utils/templateLoader.js";
import QuestionCard from "../components/QuestionCard.js";
import EmptyState from "../components/EmptyState.js";
import {
  questionFormModalHTML,
  setupQuestionModal,
} from "../components/QuestionFormModal.js";
import {
  confirmModalHTML,
  setupConfirmModal,
} from "../components/ConfirmModal.js";
import { getErrorMessage } from "../utils/errorMessage.js";
import { importWithRetry } from "../utils/moduleLoader.js";
import { getCurrentUser } from "../services/authService.js";
import ErrorView from "./ErrorView.js";

export default async function PreguntasView(params) {
  const idsubtopic = params?.idsubtopic;
  const currentUserId = getCurrentUser()?.id ?? null;

  function canEditQuestion(q) {
    if (currentUserId == null) return false;
    return Number(q.created_by) === Number(currentUserId);
  }

  let questions = [];
  let subMeta = null;
  let areaDescription = "Área";
  let disciplineDescription = "Disciplina";
  let topicDescription = "Tema";
  let subtopicDescription = "Subtema";
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

  if (questions.length > 0) {
    const first = questions[0];
    areaDescription = first.knowledge_area ?? areaDescription;
    disciplineDescription = first.discipline ?? disciplineDescription;
    topicDescription = first.topic ?? topicDescription;
    subtopicDescription = first.subtopic ?? subtopicDescription;
  } else {
    try {
      const { default: SubtopicsService } = await importWithRetry(
        new URL("../services/subtopicsService.js", import.meta.url).href
      );
      subMeta = await new SubtopicsService().getById(idsubtopic);
      if (subMeta) {
        areaDescription = subMeta.knowledge_area ?? areaDescription;
        disciplineDescription = subMeta.discipline ?? disciplineDescription;
        topicDescription = subMeta.topic ?? topicDescription;
        subtopicDescription = subMeta.description ?? subtopicDescription;
      }
    } catch { }
  }

  const breadcrumb = buildBreadcrumb(questions, subMeta, idsubtopic);

  function renderQuestionList(list) {
    return list.map((q) => QuestionCard(q, canEditQuestion(q))).join("");
  }

  function renderEmptyState() {
    return EmptyState({
      title: "Aún no hay preguntas",
      description: "Creá la primera pregunta de este subtema para empezar.",
      ctaText: "Agregar la primera pregunta",
      ctaId: "empty-state-add-btn",
    });
  }

  function renderInitialContent() {
    if (questions.length === 0) return renderEmptyState();
    return renderQuestionList(questions);
  }

  const formModal = questionFormModalHTML(
    areaDescription,
    disciplineDescription,
    topicDescription,
    subtopicDescription
  );
  const deleteModal = confirmModalHTML();

  const html = await loadTemplate("preguntas.html", import.meta.url);
  const rendered = html
    .replace("{{breadcrumb}}", breadcrumb)
    .replace("{{questionCount}}", questions.length)
    .replace("{{content}}", renderInitialContent())
    .replace("{{formModal}}", formModal)
    .replace("{{confirmModal}}", deleteModal);

  setTimeout(async () => {
    const container = document.getElementById("question-container");
    const addBtn = document.getElementById("preguntas-add-btn");
    if (!container || !addBtn) return;

    const questionModalCtrl = await setupQuestionModal({
      idsubtopic,
      onAfterSave: () => reloadQuestions(),
    });
    const confirmCtrl = setupConfirmModal();

    function wireEmptyStateCTA() {
      const ctaBtn = document.getElementById("empty-state-add-btn");
      if (ctaBtn)
        ctaBtn.addEventListener("click", () => questionModalCtrl?.openAdd());
    }

    async function reloadQuestions() {
      container.innerHTML = `<div class="question-card" style="margin:0.75rem;padding:1rem;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius);opacity:0.7"><p class="question-info">Cargando preguntas…</p></div>`;
      try {
        const { default: InfoAndQuestionsService } = await importWithRetry(
          new URL("../services/infoAndQuestionsService.js", import.meta.url).href
        );
        const service = new InfoAndQuestionsService();
        const list = await service.getBySubtopic(idsubtopic);
        questions = list;
        if (list.length === 0) {
          container.innerHTML = renderEmptyState();
          wireEmptyStateCTA();
        } else {
          container.innerHTML = renderQuestionList(list);
        }
      } catch (e) {
        container.innerHTML = `<div class="question-card" style="margin:0.75rem;padding:1rem;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius)"><p class="question-info">${getErrorMessage(e)}</p></div>`;
      }
    }

    addBtn.addEventListener("click", () => {
      if (questionModalCtrl) questionModalCtrl.openAdd();
    });

    wireEmptyStateCTA();

    container.addEventListener("click", async (event) => {
      const editBtn = event.target.closest('[data-action="edit-question"]');
      if (editBtn) {
        if (editBtn.disabled) return;
        const q = questions.find((x) => String(x.id) === editBtn.dataset.questionId);
        if (q && questionModalCtrl) questionModalCtrl.openEdit(q);
        return;
      }
      const deleteBtn = event.target.closest('[data-action="delete-question"]');
      if (deleteBtn) {
        if (deleteBtn.disabled) return;
        const q = questions.find((x) => String(x.id) === deleteBtn.dataset.questionId);
        if (!q || !confirmCtrl) return;
        if (!canEditQuestion(q)) return;
        const confirmed = await confirmCtrl.confirm();
        if (!confirmed) return;
        try {
          const { default: InfoAndQuestionsService } = await importWithRetry(
            new URL("../services/infoAndQuestionsService.js", import.meta.url).href
          );
          const service = new InfoAndQuestionsService();
          await service.delete(q.id);
          await reloadQuestions();
        } catch (e) {
          container.innerHTML = `<div class="question-card" style="margin:0.75rem;padding:1rem;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius)"><p class="question-info">${getErrorMessage(e)}</p></div>`;
        }
      }
    });
  }, 0);

  return rendered;
}

function buildBreadcrumb(questions, subMeta, idsubtopic) {
  if (questions.length > 0) {
    const first = questions[0];
    return breadcrumbHTML([
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
  }
  if (subMeta) {
    return breadcrumbHTML([
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
  }
  return breadcrumbHTML([
    { label: "Editor de Preguntas", href: "/editar/preguntas" },
    { label: "Preguntas" },
  ]);
}
