import BoardCard from "../components/BoardCard.js";
import EmptyState from "../components/EmptyState.js";
import {
  duplicateBoardModalHTML,
  setupDuplicateBoardModal,
} from "../components/DuplicateBoardModal.js";
import loadTemplate from "../utils/templateLoader.js";
import { getErrorMessage } from "../utils/errorMessage.js";
import { importWithRetry } from "../utils/moduleLoader.js";
import ErrorView from "./ErrorView.js";

// Contenido dinámico: listado de tableros (ruta /editar/tableros).

export default async function TablerosView() {
  let boards = [];
  let errorMessage = null;

  try {
    const { default: BoardsService } = await importWithRetry(
      new URL("../services/boardsService.js", import.meta.url).href
    );
    const service = new BoardsService();
    boards = await service.getBoards();
  } catch (e) {
    errorMessage = getErrorMessage(e);
  }

  if (errorMessage) {
    return ErrorView({ message: errorMessage });
  }

  const plural = boards.length === 1 ? "" : "s";
  const countText = `${boards.length} tablero${plural} cargado${plural}.`;

  const boardsHtml = boards.length
    ? boards.map((board) => BoardCard(board)).join("")
    : EmptyState({
        title: "Aún no hay tableros disponibles",
        description: "No se encontraron tableros para tu cuenta.",
        ctaText: "Recargar",
        ctaId: "boards-reload-btn",
      });

  const template = await loadTemplate("tableros.html", import.meta.url);
  const rendered = template
    .replace("{{countText}}", countText)
    .replace("{{boards}}", boardsHtml)
    .replace("{{modal}}", duplicateBoardModalHTML());

  setTimeout(async () => {
    const grid = document.getElementById("board-grid");
    const btn = document.getElementById("boards-reload-btn");
    if (btn) {
      btn.addEventListener("click", () =>
        window.dispatchEvent(new Event("wl:router-refresh"))
      );
    }

    const modalCtrl = await setupDuplicateBoardModal({
      onAfterSave: () => window.dispatchEvent(new Event("wl:router-refresh")),
    });
    if (!grid || !modalCtrl) return;

    grid.addEventListener("click", (event) => {
      const dupBtn = event.target.closest('[data-action="duplicate-board"]');
      if (!dupBtn) return;
      const board = boards.find(
        (b) => String(b.id) === dupBtn.dataset.boardId
      );
      if (!board) return;
      modalCtrl.open(board.id, board.board_name);
    });
  }, 0);

  return rendered;
}
