import loadTemplate from "../utils/templateLoader.js";
import { getErrorMessage } from "../utils/errorMessage.js";
import { importWithRetry } from "../utils/moduleLoader.js";
import { breadcrumbHTML } from "../components/Breadcrumb.js";
import { escapeXml } from "../utils/svg.js";
import { tileInfoCardHTML, tileInfoEmptyHTML } from "../components/board/TileInfoCard.js";
import ErrorView from "./ErrorView.js";

export default async function BoardEditView(params) {
  const idBoard = Number(params.id);
  if (!Number.isFinite(idBoard) || idBoard <= 0) {
    return `
      <div class="card">
        <h2>Tablero no encontrado</h2>
        <p>Identificador invalido.</p>
        <a href="/editar/tableros" data-link>← Volver a tableros</a>
      </div>
    `;
  }

  let board = null;
  let background = null;
  let backgroundsList = [];
  let tiles = [];
  let shortcuts = [];
  let tileTypes = [];
  let errorMessage = null;

  try {
    const { default: BoardsService } = await importWithRetry(
      new URL("../services/boardsService.js", import.meta.url).href
    );
    const { default: TilesService } = await importWithRetry(
      new URL("../services/tilesService.js", import.meta.url).href
    );
    const { default: ShortcutsService } = await importWithRetry(
      new URL("../services/shortcutsService.js", import.meta.url).href
    );
    const { default: BackgroundsService } = await importWithRetry(
      new URL("../services/backgroundsService.js", import.meta.url).href
    );

    const boardData = await new BoardsService().getById(idBoard);
    if (!boardData) {
      return `
        <div class="card">
          <h2>Tablero no encontrado</h2>
          <p>No existe un tablero con id "${escapeXml(String(idBoard))}".</p>
          <a href="/editar/tableros" data-link>← Volver a tableros</a>
        </div>
      `;
    }
    board = boardData;

    const [tilesRes, shortcutsRes, tileTypesRes, bgRes, bgListRes] = await Promise.all([
      new TilesService().getByBoard(idBoard),
      new ShortcutsService().getByBoard(idBoard),
      new TilesService().getTileTypes(),
      board.id_background
        ? new BackgroundsService().getById(board.id_background)
        : Promise.resolve(null),
      new BackgroundsService().getAll(),
    ]);
    tiles = tilesRes;
    shortcuts = shortcutsRes;
    tileTypes = tileTypesRes;
    background = bgRes;
    backgroundsList = bgListRes;
  } catch (e) {
    errorMessage = getErrorMessage(e);
  }

  if (errorMessage) {
    return ErrorView({ message: errorMessage });
  }

  const { default: Board } = await importWithRetry(
    new URL("../components/board/Board.js", import.meta.url).href
    );

  const tilesByNum = new Map(tiles.map((t) => [t.num_tile, t]));
  let selectedNumTile = null;

  const boardSvg = Board({ board, background, tiles, tileTypes, shortcuts, selectedNumTile });

  // Si board.id_background es null, el primer background de la lista queda seleccionado.
  const selectedBgId = board.id_background ?? backgroundsList[0]?.id ?? null;

  const bgOptions = backgroundsList
    .map((bg) => {
      const isSelected = String(bg.id) === String(selectedBgId);
      return `<option value="${escapeXml(String(bg.id))}"${isSelected ? " selected" : ""}>${escapeXml(bg.background_name ?? "")}</option>`;
    })
    .join("");

  const breadcrumb = breadcrumbHTML([
    { label: "Editar", href: "/editar" },
    { label: "Tableros", href: "/editar/tableros" },
    { label: board.board_name || "Editar" },
  ]);

  const tileInfoCard = tileInfoEmptyHTML();

  const template = await loadTemplate("board-edit.html", import.meta.url);
  const rendered = template
    .replace("{{breadcrumb}}", breadcrumb)
    .replace("{{boardNameEscaped}}", escapeXml(board.board_name ?? ""))
    .replace("{{boardDescription}}", escapeXml(board.board_description ?? ""))
    .replace("{{bgOptions}}", bgOptions)
    .replace("{{tileInfoCard}}", tileInfoCard)
    .replace("{{boardSvg}}", boardSvg);

  // Re-render del preview al cambiar el background seleccionado y
  // selección de casillas por click en el preview.
  setTimeout(() => {
    const select = document.getElementById("bf-bg-select");
    const preview = document.getElementById("board-edit-preview");
    if (!preview) return;
    const backgroundsById = new Map(backgroundsList.map((bg) => [String(bg.id), bg]));

    if (select) {
      select.addEventListener("change", () => {
        const bg = backgroundsById.get(select.value) ?? null;
        preview.innerHTML = Board({ board, background: bg, tiles, tileTypes, shortcuts, selectedNumTile });
      });
    }

    preview.addEventListener("click", (event) => {
      const target = event.target.closest("g[data-num-tile]");
      if (!target) return;
      const num = Number(target.getAttribute("data-num-tile"));
      if (!Number.isFinite(num)) return;
      const tile = tilesByNum.get(num);
      if (!tile) return;
      if (selectedNumTile === num) return;
      selectedNumTile = num;
      const currentBg = select && backgroundsById.get(select.value);
      preview.innerHTML = Board({
        board,
        background: currentBg ?? background,
        tiles,
        tileTypes,
        shortcuts,
        selectedNumTile,
      });
      const infoEl = document.getElementById("board-edit-tile-info");
      if (infoEl && infoEl.parentNode) {
        infoEl.parentNode.innerHTML = tileInfoCardHTML(tile);
      }
    });
  }, 0);

  return rendered;
}