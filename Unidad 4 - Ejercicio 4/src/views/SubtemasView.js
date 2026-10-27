import SubtopicCard from "../components/SubtopicCard.js";
import { breadcrumbHTML } from "../components/Breadcrumb.js";
import EmptyState from "../components/EmptyState.js";
import { subtopicFormModalHTML, setupSubtopicModal } from "../components/SubtopicFormModal.js";
import { confirmModalHTML, setupConfirmModal } from "../components/ConfirmModal.js";
import loadTemplate from "../utils/templateLoader.js";
import { getErrorMessage } from "../utils/errorMessage.js";
import { importWithRetry } from "../utils/moduleLoader.js";
import { getCurrentUser } from "../services/authService.js";
import { BASE_URL } from "../config.js";
import { shareContent, encodeSharePayload } from "../utils/share.js";
import ErrorView from "./ErrorView.js";

// Campos de una pregunta que la API necesita para crearla.
const QUESTION_FIELDS = [
  "information",
  "question",
  "answer_1",
  "answer_2",
  "answer_3",
  "answer_4",
  "answer_ok",
];

// Mensaje del enlace:_txt_ va en los datos, no en la URL.
function buildShareText(subtopic, discipline, count) {
  return (
    `¡Te comparto el subtema «${subtopic.description}» con sus ${count} ` +
    `pregunta${count === 1 ? "" : "s"} de ${discipline}! Ábrelo en el Panel Educativo de Wires&Ladders ` +
    `y agrégalo a tus temas con un solo clic ✨`
  );
}

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

      // Comparte un subtema: arma el enlace con el subtema y sus preguntas,
      // y lo manda al menú nativo del sistema (o al portapapeles).
      async function shareSubtopic(sub, button) {
        const originalLabel = button.getAttribute("title");
        button.disabled = true;
        try {
          const [
            { default: TopicsService },
            { default: InfoAndQuestionsService },
          ] = await Promise.all([
            importWithRetry(
              new URL("../services/topicsService.js", import.meta.url).href
            ),
            importWithRetry(
              new URL(
                "../services/infoAndQuestionsService.js",
                import.meta.url
              ).href
            ),
          ]);

          const [topic, questions] = await Promise.all([
            new TopicsService().getById(idtopic),
            new InfoAndQuestionsService().getBySubtopic(sub.id),
          ]);

          // Solo se mandan los campos que la API necesita para recrearlos.
          const cleanQuestions = questions.map((q) => {
            const item = {};
            for (const field of QUESTION_FIELDS) item[field] = q[field] ?? "";
            return item;
          });

          const payload = {
            subtopic: {
              id: sub.id,
              description: sub.description,
              details: sub.details ?? "",
            },
            topic: {
              description: topic?.description ?? topicDescription,
              details: topic?.details ?? "",
            },
            // La disciplina y el nivel son catálogo global: sus ids son
            // válidos para cualquier usuario que abra el enlace.
            discipline: {
              id: topic?.id_discipline ?? iddisc,
              name: disciplineDescription,
            },
            level: { id: topic?.id_level ?? null },
            questions: cleanQuestions,
          };

          const encoded = encodeSharePayload(payload);
          const url = `${location.origin}/${BASE_URL}/compartir?p=${encoded}`;
          const text = buildShareText(
            payload.subtopic,
            payload.discipline.name,
            cleanQuestions.length
          );

          const result = await shareContent({ title: "Wires&Ladders", text, url });

          if (result === "copied") {
            showShareNotice(
              "No hay menú de compartir en este navegador: el enlace quedó copiado al portapapeles."
            );
          }
        } catch (e) {
          showShareNotice(getErrorMessage(e));
        } finally {
          button.disabled = false;
          if (originalLabel) button.setAttribute("title", originalLabel);
        }
      }

      // Aviso temporal en la parte superior de la lista de subtemas.
      let shareNoticeTimer = null;
      function showShareNotice(message) {
        let notice = document.getElementById("share-notice");
        if (!notice) {
          notice = document.createElement("p");
          notice.id = "share-notice";
          notice.className = "topic-stale-banner";
          container.prepend(notice);
        }
        notice.textContent = message;
        notice.hidden = false;
        clearTimeout(shareNoticeTimer);
        shareNoticeTimer = setTimeout(() => (notice.hidden = true), 6000);
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
        const shareBtn = event.target.closest('[data-action="share-subtopic"]');
        if (shareBtn) {
          const sub = subtopics.find(
            (s) => String(s.id) === shareBtn.dataset.subtopicId
          );
          if (sub) await shareSubtopic(sub, shareBtn);
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
