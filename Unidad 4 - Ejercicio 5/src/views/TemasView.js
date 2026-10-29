import TopicCard from "../components/TopicCard.js";
import LevelFilter from "../components/LevelFilter.js";
import { breadcrumbHTML } from "../components/Breadcrumb.js";
import EmptyState from "../components/EmptyState.js";
import { topicFormModalHTML, setupTopicModal } from "../components/TopicFormModal.js";
import { confirmModalHTML, setupConfirmModal } from "../components/ConfirmModal.js";
import loadTemplate from "../utils/templateLoader.js";
import { getErrorMessage } from "../utils/errorMessage.js";
import { importWithRetry } from "../utils/moduleLoader.js";
import { getCurrentUser } from "../services/authService.js";
import { getOutbox } from "../services/dbService.js";
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
  let staleTopics = null;
  let listIsStale = false;

  async function pendingForLevel(levelId) {
    const items = await getOutbox().catch(() => []);
    return items
      .filter(
        (i) =>
          String(i.disciplineId) === String(iddisc) &&
          String(i.levelId) === String(levelId)
      )
      .map((i) => ({ item: i, topic: itemToPendingTopic(i, currentUserId) }));
  }

  function itemToPendingTopic(item, userId) {
    if (item.kind === "topic-update") {
      return { id: item.payload.id, pendingEdit: true, outboxId: item.id };
    }
    return {
      id: `pendiente-${item.id}`,
      description: item.payload.description,
      details: item.payload.details,
      id_level: item.payload.id_level,
      created_by: userId,
      tot_subtopics: 0,
      pending: true,
      needsAttention: Boolean(item.needsAttention),
      outboxId: item.id,
    };
  }

  // Mezcla los pendientes sobre la lista real del servidor.
  async function mergePending(list, levelId) {
    const pendings = await pendingForLevel(levelId);
    if (!pendings.length) return list;

    const editById = new Map(
      pendings
        .filter((p) => p.item.kind === "topic-update")
        .map((p) => [String(p.item.payload.id), p.item])
    );

    const withEdits = list.map((t) =>
      editById.has(String(t.id))
        ? { ...t, pendingEdit: true, needsAttention: Boolean(editById.get(String(t.id)).needsAttention) }
        : t
    );
    editById.clear();

    const created = pendings
      .filter((p) => p.item.kind === "topic-create")
      .map((p) => p.topic);

    return [...created, ...withEdits];
  }

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
      staleTopics = list;
      listIsStale = false;
      return list;
    }

    // Aviso cuando la lista viene de la copia local, no del servidor.
    function offlineBanner() {
      return `<p class="topic-stale-banner">Sin conexión: se muestran los últimos temas conocidos y lo que está en la cola.</p>`;
    }

    async function renderInto(container, levelId, baseList, stale = false) {
      const visible = await mergePending(baseList, levelId);
      if (visible.length === 0) {
        container.innerHTML = renderEmptyState();
        return true; // Ensure CTA wiring runs for empty state
      }
      const lvlLabel = findLevel(levels, levelId)?.description ?? "";
      container.innerHTML =
        (stale ? offlineBanner() : "") + renderTopicList(visible, lvlLabel);
      return true;
    }

    if (discipline && currentLevelId != null) {
      try {
        await loadTopicsFor(currentLevelId);
      } catch {
        /* offline o API caída: la lista se arma con la copia local + la cola */
        listIsStale = true;
      }
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
      // Un tema pendiente aún no existe en el servidor: no se puede editar
      // ni borrar hasta que el SW confirme el envío.
      return `<ul class="topic-list" id="topic-list">${list
        .map((t) => TopicCard(t, disciplineColor, lvlLabel, !t.pending && canEditTopic(t)))
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

    async function renderInitialContent() {
      const visible = await mergePending(topics, currentLevelId);
      if (visible.length === 0) return renderEmptyState();
      return (listIsStale ? offlineBanner() : "") + renderTopicList(visible, levelLabel);
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
      .replace("{{content}}", await renderInitialContent())
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
        onAfterSave: async ({ pending } = {}) => {
          if (pending) {
            await renderInto(container, currentLevelId, staleTopics ?? topics, listIsStale);
          }
          await reloadLevel(currentLevelId, { showLoading: !pending });
        },
      });
      const confirmCtrl = setupConfirmModal();

      function wireEmptyStateCTA() {
        const ctaBtn = document.getElementById("empty-state-add-btn");
        if (ctaBtn) ctaBtn.addEventListener("click", () => topicModalCtrl?.openAdd());
      }

      async function reloadLevel(levelId, { showLoading = true } = {}) {
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

        if (showLoading) {
          container.innerHTML = `<div class="topic-card topic-card--loading" style="margin:0.75rem;padding:1rem;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius);opacity:0.7"><p class="topic-details">Cargando temas…</p></div>`;
        }

        let baseList = null;
        listIsStale = false;
        try {
          baseList = await loadTopicsFor(levelId);
        } catch (e) {
          listIsStale = true;
          if (!staleTopics) {
            container.innerHTML = `<div class="topic-card" style="margin:0.75rem;padding:1rem;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius)"><p class="topic-details">${getErrorMessage(e)}</p></div>`;
            return;
          }
          baseList = staleTopics;
        }

        const drew = await renderInto(container, levelId, baseList, listIsStale);
        if (drew) wireEmptyStateCTA();
      }

      async function refreshAfterSync() {
        const live = document.getElementById("topic-container");
        if (!live) return;
        await renderInto(live, currentLevelId, staleTopics ?? topics, listIsStale);
        if (navigator.onLine) await reloadLevel(currentLevelId, { showLoading: false });
      }

      window.addEventListener("outbox-changed", refreshAfterSync);
      navigator.serviceWorker?.addEventListener("message", (event) => {
        if (event.data?.type === "OUTBOX_SENT") refreshAfterSync();
      });

      filterContainer.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-level-id]");
        if (!btn) return;
        reloadLevel(btn.dataset.levelId);
      });

      addBtn.addEventListener("click", () => {
        if (!topicModalCtrl) return;
        const activeBadge = filterContainer.querySelector(".level-badge.is-active");
        const liveLevelId = activeBadge ? activeBadge.dataset.levelId : currentLevelId;
        topicModalCtrl.openAdd({ levelId: liveLevelId });
      });

      wireEmptyStateCTA();

      container.addEventListener("click", async (event) => {
        const editBtn = event.target.closest('[data-action="edit-topic"]');
        if (editBtn) {
          const topic = topics.find((t) => String(t.id) === editBtn.dataset.topicId);
          if (topic && topicModalCtrl && !topic.pending) topicModalCtrl.openEdit(topic);
          return;
        }
        const deleteBtn = event.target.closest('[data-action="delete-topic"]');
        if (deleteBtn) {
          if (deleteBtn.disabled) return;
          const topic = topics.find((t) => String(t.id) === deleteBtn.dataset.topicId);
          if (!topic || !confirmCtrl) return;
          if (!canEditTopic(topic)) return;
          if (topic.pending) return;
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
