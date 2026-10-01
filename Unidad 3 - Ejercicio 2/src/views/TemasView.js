import TopicCard from "../components/TopicCard.js";
import LevelFilter from "../components/LevelFilter.js";
import { breadcrumbHTML } from "../components/Breadcrumb.js";
import EmptyState from "../components/EmptyState.js";
import {
  topicFormModalHTML,
  setupTopicModal,
} from "../components/TopicFormModal.js";
import {
  confirmModalHTML,
  setupConfirmModal,
} from "../components/ConfirmModal.js";
import loadTemplate from "../utils/templateLoader.js";
import { getErrorMessage } from "../utils/errorMessage.js";
import { importWithRetry } from "../utils/moduleLoader.js";
import { getCurrentUser } from "../services/authService.js";
import ErrorView from "./ErrorView.js";

const FILTER_KEY = "temas.levelFilter";

function readFilter(levels) {
  try {
    const stored = sessionStorage.getItem(FILTER_KEY);
    if (stored && levels.some((l) => String(l.id) === String(stored))) {
      return stored;
    }
  } catch {}
  return levels[0]?.id ?? null;
}

function writeFilter(value) {
  try {
    if (value) sessionStorage.setItem(FILTER_KEY, String(value));
    else sessionStorage.removeItem(FILTER_KEY);
  } catch {}
}

function findLevel(levels, id) {
  return levels.find((l) => String(l.id) === String(id)) ?? null;
}

export default async function TemasView(params) {
  const iddisc = params?.iddisc;
  const currentUserId = getCurrentUser()?.id ?? null;
  function canEditTopic(topic) {
    if (currentUserId == null) return false;
    return Number(topic.created_by) === Number(currentUserId);
  }
  let discipline = null;
  let levels = [];
  let topics = [];
  let currentLevelId = null;
  let errorMessage = null;

  try {
    const [
      { default: DisciplinesService },
      { default: LevelsService },
    ] = await Promise.all([
      importWithRetry(
        new URL("../services/disciplinesService.js", import.meta.url).href
      ),
      importWithRetry(
        new URL("../services/levelsService.js", import.meta.url).href
      ),
    ]);

    const disciplinesService = new DisciplinesService();
    const levelsService = new LevelsService();

    [discipline, levels] = await Promise.all([
      disciplinesService.getById(iddisc),
      levelsService.getAll(),
    ]);

    currentLevelId = readFilter(levels);

    const { default: TopicsService } = await importWithRetry(
      new URL("../services/topicsService.js", import.meta.url).href
    );
    const topicsService = new TopicsService();

    async function loadTopicsFor(levelId) {
      const list = await topicsService.getByDisciplineAndLevel(iddisc, levelId);
      topics = list;
      return list;
    }

    if (discipline && currentLevelId != null) {
      await loadTopicsFor(currentLevelId);
    }

    const levelObj = findLevel(levels, currentLevelId);
    const levelLabel = levelObj?.description ?? "";
    const disciplineColor = discipline?.color ?? "#888888";
    const idka = discipline?.id_knowledge_area ?? null;
    const breadcrumb = breadcrumbHTML([
      { label: "Editor de Preguntas", href: "/editar/preguntas" },
      ...(discipline
        ? [{ label: discipline.knowledge_area, href: idka ? `/editar/disciplinas/${idka}` : undefined }]
        : []),
      { label: discipline?.description ?? "Disciplina" },
    ]);

    function renderTopicList(list, lvlLabel) {
      return `<ul class="topic-list" id="topic-list">${list
        .map((t) => TopicCard(t, disciplineColor, lvlLabel, canEditTopic(t)))
        .join("")}</ul>`;
    }

    function renderEmptyState() {
      return EmptyState({
        title: "Aún no hay temas en este nivel",
        description:
          "Crea el primer tema para empezar a organizar las preguntas.",
        ctaText: "Agregar el primer tema",
        ctaId: "empty-state-add-btn",
      });
    }

    function renderInitialContent() {
      if (topics.length === 0) return renderEmptyState();
      return renderTopicList(topics, levelLabel);
    }

    const levelChips = LevelFilter(levels, currentLevelId);
    const formModal = topicFormModalHTML(
      levels,
      currentLevelId,
      discipline?.knowledge_area,
      discipline?.description
    );
    const deleteModal = confirmModalHTML();

    const html = await loadTemplate("temas.html", import.meta.url);
    const rendered = html
      .replace("{{breadcrumb}}", breadcrumb)
      .replace("{{levelChips}}", levelChips)
      .replace("{{content}}", renderInitialContent())
      .replace("{{formModal}}", formModal)
      .replace("{{confirmModal}}", deleteModal);

    setTimeout(async () => {
      const filterContainer = document.getElementById("level-filter-container");
      const container = document.getElementById("topic-container");
      const addBtn = document.getElementById("temas-add-btn");
      if (!filterContainer || !container || !addBtn) return;

      const topicModalCtrl = await setupTopicModal({
        levels,
        currentLevelId,
        iddisc,
        onAfterSave: () => reloadLevel(currentLevelId),
      });
      const confirmCtrl = setupConfirmModal();

      function wireEmptyStateCTA() {
        const ctaBtn = document.getElementById("empty-state-add-btn");
        if (ctaBtn) ctaBtn.addEventListener("click", () => topicModalCtrl?.openAdd());
      }

      async function reloadLevel(levelId) {
        const newLevel = findLevel(levels, levelId);
        if (!newLevel) return;
        writeFilter(levelId);
        currentLevelId = levelId;

        filterContainer
          .querySelectorAll(".level-badge")
          .forEach((b) => {
            const isActive = b.dataset.levelId === String(levelId);
            b.classList.toggle("is-active", isActive);
            b.setAttribute("aria-pressed", String(isActive));
          });

        container.innerHTML = `<div class="topic-card topic-card--loading" style="margin:0.75rem;padding:1rem;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius);opacity:0.7"><p class="topic-details">Cargando temas…</p></div>`;

        try {
          const list = await loadTopicsFor(levelId);
          if (list.length === 0) {
            container.innerHTML = renderEmptyState();
            wireEmptyStateCTA();
          } else {
            container.innerHTML = renderTopicList(list, newLevel.description);
          }
        } catch (e) {
          container.innerHTML = `<div class="topic-card" style="margin:0.75rem;padding:1rem;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius)"><p class="topic-details">${getErrorMessage(e)}</p></div>`;
        }
      }

      filterContainer.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-level-id]");
        if (!btn) return;
        reloadLevel(btn.dataset.levelId);
      });

      addBtn.addEventListener("click", () => {
        if (topicModalCtrl) topicModalCtrl.openAdd();
      });

      wireEmptyStateCTA();

      container.addEventListener("click", async (event) => {
        const editBtn = event.target.closest('[data-action="edit-topic"]');
        if (editBtn) {
          const topic = topics.find((t) => String(t.id) === editBtn.dataset.topicId);
          if (topic && topicModalCtrl) topicModalCtrl.openEdit(topic);
          return;
        }
        const deleteBtn = event.target.closest('[data-action="delete-topic"]');
        if (deleteBtn) {
          if (deleteBtn.disabled) return;
          const topic = topics.find((t) => String(t.id) === deleteBtn.dataset.topicId);
          if (!topic || !confirmCtrl) return;
          if (!canEditTopic(topic)) return;
          if ((topic.tot_subtopics ?? 0) > 0) return;
          const confirmed = await confirmCtrl.confirm();
          if (!confirmed) return;
          try {
            const { default: TopicsService } = await importWithRetry(
              new URL("../services/topicsService.js", import.meta.url).href
            );
            const topicsService = new TopicsService();
            await topicsService.delete(topic.id);
            await reloadLevel(currentLevelId);
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
      <h2>Disciplina no encontrada</h2>
      <p>No existe una disciplina con id "${iddisc ?? ""}".</p>
      <a href="/editar/preguntas" data-link>← Volver a áreas</a>
    </div>
  `;
}
