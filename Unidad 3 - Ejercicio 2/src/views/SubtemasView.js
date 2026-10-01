import SubtopicCard from "../components/SubtopicCard.js";
import { breadcrumbHTML } from "../components/Breadcrumb.js";
import EmptyState from "../components/EmptyState.js";
import {
  subtopicFormModalHTML,
  setupSubtopicModal,
} from "../components/SubtopicFormModal.js";
import {
  confirmModalHTML,
  setupConfirmModal,
} from "../components/ConfirmModal.js";
import loadTemplate from "../utils/templateLoader.js";
import { getErrorMessage } from "../utils/errorMessage.js";
import { importWithRetry } from "../utils/moduleLoader.js";
import { getCurrentUser } from "../services/authService.js";
import ErrorView from "./ErrorView.js";

export default async function SubtemasView(params) {
  const idtopic = params?.idtopic;
  const currentUserId = getCurrentUser()?.id ?? null;
  function canEditSubtopic(sub) {
    if (currentUserId == null) return false;
    return Number(sub.created_by) === Number(currentUserId);
  }

  let subtopics = [];
  let areaDescription = "Área";
  let disciplineDescription = "Disciplina";
  let topicDescription = "Tema";
  let disciplineColor = "#888888";
  let iddisc = null;
  let errorMessage = null;

  try {
    const [
      { default: SubtopicsService },
      { default: TopicsService },
    ] = await Promise.all([
      importWithRetry(
        new URL("../services/subtopicsService.js", import.meta.url).href
      ),
      importWithRetry(
        new URL("../services/topicsService.js", import.meta.url).href
      ),
    ]);

    const subtopicsService = new SubtopicsService();
    const topicsService = new TopicsService();

    const list = await subtopicsService.getByTopic(idtopic);
    subtopics = list;

    if (list.length > 0) {
      const first = list[0];
      areaDescription = first.knowledge_area;
      disciplineDescription = first.discipline;
      topicDescription = first.topic;
      disciplineColor = first.color;
      iddisc = first.id_discipline;
    } else {
      const topic = await topicsService.getById(idtopic);
      if (topic) {
        areaDescription = topic.knowledge_area;
        disciplineDescription = topic.discipline;
        topicDescription = topic.description;
        disciplineColor = topic.color;
        iddisc = topic.id_discipline;
      }
    }

    const breadcrumb = breadcrumbHTML([
      { label: "Editor de Preguntas", href: "/editar/preguntas" },
      ...(areaDescription !== "Área" && iddisc
        ? [{ label: areaDescription, href: `/editar/disciplinas/${iddisc}` }]
        : []),
      ...(disciplineDescription !== "Disciplina"
        ? [{ label: disciplineDescription, href: iddisc ? `/editar/temas/${iddisc}` : undefined }]
        : []),
      { label: topicDescription },
    ]);

    function renderSubtopicList(list) {
      return `<ul class="topic-list" id="subtopic-list">${list
        .map((s) => SubtopicCard(s, disciplineColor, canEditSubtopic(s)))
        .join("")}</ul>`;
    }

    function renderEmptyState() {
      return EmptyState({
        title: "Aún no hay subtemas",
        description:
          "Crea el primer subtema para empezar a organizar las preguntas.",
        ctaText: "Agregar el primer subtema",
        ctaId: "empty-state-add-btn",
      });
    }

    function renderInitialContent() {
      if (subtopics.length === 0) return renderEmptyState();
      return renderSubtopicList(subtopics);
    }

    const formModal = subtopicFormModalHTML(
      areaDescription,
      disciplineDescription,
      topicDescription
    );
    const deleteModal = confirmModalHTML();

    const html = await loadTemplate("subtemas.html", import.meta.url);
    const rendered = html
      .replace("{{breadcrumb}}", breadcrumb)
      .replace("{{content}}", renderInitialContent())
      .replace(/\{\{iddisc\}\}/g, iddisc ?? "")
      .replace("{{formModal}}", formModal)
      .replace("{{confirmModal}}", deleteModal);

    setTimeout(async () => {
      const container = document.getElementById("subtopic-container");
      const addBtn = document.getElementById("subtemas-add-btn");
      if (!container || !addBtn) return;

      const subtopicModalCtrl = await setupSubtopicModal({
        idtopic,
        onAfterSave: () => reloadSubtopics(),
      });
      const confirmCtrl = setupConfirmModal();

      function wireEmptyStateCTA() {
        const ctaBtn = document.getElementById("empty-state-add-btn");
        if (ctaBtn)
          ctaBtn.addEventListener("click", () => subtopicModalCtrl?.openAdd());
      }

      async function reloadSubtopics() {
        container.innerHTML = `<div class="topic-card topic-card--loading" style="margin:0.75rem;padding:1rem;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius);opacity:0.7"><p class="topic-details">Cargando subtemas…</p></div>`;
        try {
          const { default: SubtopicsService } = await importWithRetry(
            new URL("../services/subtopicsService.js", import.meta.url).href
          );
          const service = new SubtopicsService();
          const list = await service.getByTopic(idtopic);
          subtopics = list;
          if (list.length === 0) {
            container.innerHTML = renderEmptyState();
            wireEmptyStateCTA();
          } else {
            container.innerHTML = renderSubtopicList(list);
          }
        } catch (e) {
          container.innerHTML = `<div class="topic-card" style="margin:0.75rem;padding:1rem;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius)"><p class="topic-details">${getErrorMessage(e)}</p></div>`;
        }
      }

      addBtn.addEventListener("click", () => {
        if (subtopicModalCtrl) subtopicModalCtrl.openAdd();
      });

      wireEmptyStateCTA();

      container.addEventListener("click", async (event) => {
        const editBtn = event.target.closest('[data-action="edit-subtopic"]');
        if (editBtn) {
          const sub = subtopics.find(
            (s) => String(s.id) === editBtn.dataset.subtopicId
          );
          if (sub && subtopicModalCtrl) subtopicModalCtrl.openEdit(sub);
          return;
        }
        const deleteBtn = event.target.closest('[data-action="delete-subtopic"]');
        if (deleteBtn) {
          if (deleteBtn.disabled) return;
          const sub = subtopics.find(
            (s) => String(s.id) === deleteBtn.dataset.subtopicId
          );
          if (!sub || !confirmCtrl) return;
          if (!canEditSubtopic(sub)) return;
          if ((sub.tot_questions ?? 0) > 0) return;
          const confirmed = await confirmCtrl.confirm();
          if (!confirmed) return;
          try {
            const { default: SubtopicsService } = await importWithRetry(
              new URL("../services/subtopicsService.js", import.meta.url).href
            );
            const service = new SubtopicsService();
            await service.delete(sub.id);
            await reloadSubtopics();
          } catch (e) {
            container.innerHTML = `<div class="topic-card" style="margin:0.75rem;padding:1rem;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius)"><p class="topic-details">${getErrorMessage(e)}</p></div>`;
          }
        }
      });
    }, 0);

    return rendered;
  } catch (e) {
    errorMessage = getErrorMessage(e);
  }

  if (errorMessage) {
    return ErrorView({ message: errorMessage });
  }

  return `
    <div class="card">
      <h2>Tema no encontrado</h2>
      <p>No existe un tema con id "${idtopic ?? ""}".</p>
      <a href="/editar/preguntas" data-link>← Volver a áreas</a>
    </div>
  `;
}
