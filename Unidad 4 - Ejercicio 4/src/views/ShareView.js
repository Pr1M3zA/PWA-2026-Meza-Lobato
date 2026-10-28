import { decodeSharePayload } from "../utils/share.js";
import { getErrorMessage } from "../utils/errorMessage.js";
import { importWithRetry } from "../utils/moduleLoader.js";
import { isAuthenticated } from "../services/authService.js";
import { getSharedSubtopic, saveSharedSubtopic } from "../services/dbService.js";
import ErrorView from "./ErrorView.js";

const IMPORT_FIELDS = [
  "information",
  "question",
  "answer_1",
  "answer_2",
  "answer_3",
  "answer_4",
  "answer_ok",
];
function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// La API no siempre devuelve la misma forma al crear: puede ser un objeto con
// "id", con "insertId" (temas y subtemas) o un arreglo de filas.
function pickId(response) {
  if (response == null) return null;
  if (typeof response === "object" && !Array.isArray(response)) {
    return (
      response.id ??
      response.insertId ??
      response.idsubtopic ??
      response.id_topic ??
      null
    );
  }
  if (Array.isArray(response)) {
    const row = response[0];
    return row?.id ?? row?.insertId ?? null;
  }
  return null;
}

function renderQuestions(questions) {
  if (!questions?.length) {
    return `<p class="meta-muted">Este subtema no trae preguntas.</p>`;
  }
  return `
    <ul class="shared-questions">
      ${questions
        .map(
          (q, i) => `
        <li class="shared-question">
          <span class="shared-question__index">${i + 1}</span>
          <div>
            <p class="shared-question__text">${escapeHTML(q.question)}</p>
            <p class="shared-question__info">${escapeHTML(q.information)}</p>
          </div>
        </li>`
        )
        .join("")}
    </ul>`;
}

export default async function ShareView() {
  const params = new URLSearchParams(window.location.search);
  const payload = decodeSharePayload(params.get("p"));

  if (!payload?.subtopic?.description) {
    return ErrorView({
      title: "Enlace no válido",
      message:
        "El enlace de subtema compartido no contiene datos. Pide a quien lo compartió que te envíe el enlace de nuevo.",
    });
  }

  const { subtopic, topic, discipline, level, questions = [] } = payload;
  const signature = String(subtopic.id ?? subtopic.description);
  const questionCount = questions.length;

  const html = `
    <div class="share-view view-root">
      <article class="card share-card">
        <p class="modal-section">
          ${escapeHTML(discipline?.name ?? "Disciplina")} · ${escapeHTML(topic?.description ?? "Tema")}
        </p>
        <h2 class="modal-card__title"> Te compartieron un subtema</h2>
        <p class="share-card__lead">
          <strong>${escapeHTML(subtopic.description)}</strong>
          ${
            subtopic.details
              ? `<br><span class="meta-muted">${escapeHTML(subtopic.details)}</span>`
              : ""
          }
        </p>
        <p class="meta-muted">${questionCount} pregunta${questionCount === 1 ? "" : "s"} incluida${questionCount === 1 ? "" : "s"}</p>

        <details class="share-card__details">
          <summary>Ver las preguntas</summary>
          ${renderQuestions(questions)}
        </details>

        <p class="modal-error" id="share-error" hidden></p>
        <p class="modal-notice" id="share-notice" hidden></p>

        <div class="modal-actions">
          <a class="modal-btn modal-btn-secondary" href="/" data-link>Ir al inicio</a>
          <button type="button" class="modal-btn modal-btn-primary" id="share-action">Agregar a mis subtemas</button>
          <a class="modal-btn modal-btn-primary" id="share-login" href="/configuracion" data-link hidden>Iniciar sesión para agregarlo</a>
        </div>
      </article>
    </div>
  `;

  setTimeout(() => {
    const actionBtn = document.getElementById("share-action");
    const loginLink = document.getElementById("share-login");
    const errorEl = document.getElementById("share-error");
    const noticeEl = document.getElementById("share-notice");
    if (!actionBtn || !loginLink || !errorEl || !noticeEl) return;

    function showError(message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }

    // El botón espera a saber si el subtema ya estaba importado.
    actionBtn.disabled = true;

    // ¿Ya lo había agregado antes? (firma guardada en IndexedDB)
    getSharedSubtopic(signature)
      .then((record) => {
        if (!record) {
          actionBtn.disabled = false;
          return;
        }
        actionBtn.hidden = true;
        noticeEl.textContent =
          "¡Ya agregaste este subtema! Este subtema ya está en tu cuenta, no hace falta agregarlo otra vez.";
        noticeEl.hidden = false;
      })
      .catch(() => {
        // Si IndexedDB no está disponible, seguimos con el flujo normal.
        actionBtn.disabled = false;
      });

    // Sin sesión no se puede crear nada: el alta exige token.
    if (!isAuthenticated()) {
      actionBtn.hidden = true;
      loginLink.hidden = false;
      noticeEl.textContent =
        "Inicia sesión en Configuración y vuelve a abrir este enlace para agregar el subtema a tu cuenta.";
      noticeEl.hidden = false;
      return;
    }

    // Sin conexión no hay forma de crear el tema/subtema en el servidor.
    if (!navigator.onLine) {
      actionBtn.disabled = true;
      actionBtn.textContent = "Necesitas conexión para agregarlo";
      noticeEl.textContent =
        "Ya puedes ver el contenido del subtema, pero hace falta internet para guardarlo en tu cuenta. Vuelve a abrir este enlace cuando tengas conexión.";
      noticeEl.hidden = false;
    }

    actionBtn.addEventListener("click", async () => {
      actionBtn.disabled = true;
      actionBtn.textContent = "Agregando…";
      errorEl.hidden = true;
      noticeEl.hidden = true;

      try {
        const [
          { default: TopicsService },
          { default: SubtopicsService },
          { default: InfoAndQuestionsService },
        ] = await Promise.all([
          importWithRetry(
            new URL("../services/topicsService.js", import.meta.url).href
          ),
          importWithRetry(
            new URL("../services/subtopicsService.js", import.meta.url).href
          ),
          importWithRetry(
            new URL(
              "../services/infoAndQuestionsService.js",
              import.meta.url
            ).href
          ),
        ]);

        const topicsService = new TopicsService();
        const subtopicsService = new SubtopicsService();
        const questionsService = new InfoAndQuestionsService();

        // 1. ¿El receptor ya tiene un tema con ese nombre en esa disciplina/nivel?
        if (!discipline?.id || !level?.id) {
          throw new Error(
            "El enlace no incluye la disciplina y el nivel del tema; no se puede ubicar el subtema."
          );
        }

        const myTopics = await topicsService.getByDisciplineAndLevel(
          discipline.id,
          level.id
        );
        const wanted = topic.description.trim().toLowerCase();
        let targetTopic = myTopics.find(
          (t) => (t.description ?? "").trim().toLowerCase() === wanted
        );

        // 2. Si no existe, se crea para conservar la misma organización.
        if (!targetTopic) {
          const createdTopic = await topicsService.create({
            id_discipline: discipline.id,
            id_level: level.id,
            description: topic.description,
            details: topic.details ?? "",
          });
          targetTopic = { id: pickId(createdTopic), description: topic.description };
        }

        // 3. El subtema se crea en la cuenta del receptor.
        const created = await subtopicsService.create({
          id_topic: targetTopic.id,
          description: subtopic.description,
          details: subtopic.details ?? "",
        });
        const newSubtopicId = pickId(created);
        if (!newSubtopicId) {
          throw new Error(
            "El servidor no devolvió el identificador del subtema creado."
          );
        }

        // 4. Las preguntas viajan con el subtema.
        for (const q of questions) {
          const body = {};
          for (const field of IMPORT_FIELDS) body[field] = q[field] ?? "";
          // La API espera la respuesta correcta como número (1 a 4).
          body.answer_ok = Number(body.answer_ok) || 1;
          console.log(
            `[Share] Enviando pregunta al subtema ${newSubtopicId}:`,
            { id_subtopic: newSubtopicId, ...body }
          );
          await questionsService.create({ id_subtopic: newSubtopicId, ...body });
        }

        // 5. Se marca el subtema como ya importado.
        await saveSharedSubtopic({
          id: signature,
          description: subtopic.description,
          addedAt: new Date().toISOString(),
        });

        actionBtn.textContent = "¡Agregado! ";
        noticeEl.textContent = `El subtema «${subtopic.description}» ya está en tu cuenta, junto con sus ${questionCount} pregunta${questionCount === 1 ? "" : "s"}.`;
        noticeEl.hidden = false;
      } catch (e) {
        // Se registra el error real (status y mensaje del servidor) para poder
        // ver en la consola qué está rechazando la API.
        console.error("[Share] Falló la importación:", e);
        actionBtn.disabled = false;
        actionBtn.textContent = "Agregar a mis subtemas";
        showError(getErrorMessage(e));
      }
    });
  }, 0);

  return html;
}
