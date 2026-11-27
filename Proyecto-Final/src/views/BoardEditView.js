import loadTemplate from "../utils/templateLoader.js";
import { getErrorMessage } from "../utils/errorMessage.js";
import { importWithRetry } from "../utils/moduleLoader.js";
import { breadcrumbHTML } from "../components/Breadcrumb.js";
import { escapeXml } from "../utils/svg.js";
import { tileInfoCardHTML, tileInfoEmptyHTML, shortcutInfoCardHTML, newShortcutCardHTML, tilePreviewSVG } from "../components/board/TileInfoCard.js";
import { getCurrentUser } from "../services/authService.js";
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

    const currentUserId = getCurrentUser()?.id ?? null;
    if (Number(board.created_by) !== Number(currentUserId)) {
      return `
        <div class="card">
          <h2>Sin permiso</h2>
          <p>No puedes editar este tablero porque pertenece a otro usuario.</p>
          <a href="/editar/tableros" data-link>← Volver a tableros</a>
        </div>
      `;
    }

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
  const shortcutsById = new Map(shortcuts.map((s) => [String(s.id), s]));
  const shortcutNums = new Set();
  for (const s of shortcuts) {
    shortcutNums.add(s.from_tile);
    shortcutNums.add(s.to_tile);
  }
  const tileTypesById = Array.isArray(tileTypes)
    ? Object.fromEntries(tileTypes.map((tt) => [tt.id, tt]))
    : tileTypes;
  let selected = null;
  let creatingShortcut = false;

  function getValidShortcutEndpoints(currentShortcutId) {
    const ningunTypeIds = new Set(
      tileTypes.filter((t) => t.effect_name === "Ninguno").map((t) => t.id)
    );
    const ningunTiles = tiles.filter((t) => ningunTypeIds.has(t.tile_type));
    const otherFromNums = new Set(
      shortcuts
        .filter((s) => s.id !== currentShortcutId)
        .map((s) => s.from_tile)
    );
    return ningunTiles
      .filter((t) => !otherFromNums.has(t.num_tile))
      .sort((a, b) => a.num_tile - b.num_tile);
  }

  const boardSvg = Board({ board, background, tiles, tileTypes, shortcuts, selected });

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
  // selección de casillas / cables / escaleras por click en el preview.
  setTimeout(() => {
    const select = document.getElementById("bf-bg-select");
    const preview = document.getElementById("board-edit-preview");
    if (!preview) return;
    const backgroundsById = new Map(backgroundsList.map((bg) => [String(bg.id), bg]));

    function rerender() {
      const currentBg = select && backgroundsById.get(select.value);
      preview.innerHTML = Board({
        board,
        background: currentBg ?? background,
        tiles,
        tileTypes,
        shortcuts,
        selected,
      });
    }

    function closeInfoModal() {
      selected = null;
      creatingShortcut = false;
      rerender();
      setInfo(tileInfoEmptyHTML(), { isOpen: false });
    }

    function setInfo(html, { isOpen = false } = {}) {
      const container = document.querySelector(".board-edit-tile-info");
      if (container) {
        container.innerHTML = html;
        if (isOpen) {
          container.classList.add("board-edit-tile-info--open");
        } else {
          container.classList.remove("board-edit-tile-info--open");
        }
      }
    }

    if (select) {
      select.addEventListener("change", rerender);
    }

    preview.addEventListener("click", (event) => {
      // 1) Casilla hexagonal
      const tileTarget = event.target.closest("g[data-num-tile]");
      if (tileTarget) {
        const num = Number(tileTarget.getAttribute("data-num-tile"));
        if (!Number.isFinite(num)) return;
        const tile = tilesByNum.get(num);
        if (!tile) return;
        creatingShortcut = false;
        if (selected?.kind === 'tile' && Number(selected.id) === num) return;
        selected = { kind: 'tile', id: num };
        rerender();
        setInfo(tileInfoCardHTML(tile, tileTypes, { isInShortcut: shortcutNums.has(num) }), { isOpen: true });
        return;
      }

      // 2) Cable (Wire) o escalera (Ladder)
      const shortcutTarget = event.target.closest("g[data-shortcut-id]");
      if (shortcutTarget) {
        const id = shortcutTarget.getAttribute("data-shortcut-id");
        const kind = shortcutTarget.getAttribute("data-kind");
        const shortcut = shortcutsById.get(id);
        if (!shortcut || (kind !== 'wire' && kind !== 'ladder')) return;
        creatingShortcut = false;
        if (selected?.kind === kind && String(selected.id) === id) return;
        selected = { kind, id: Number(id) };
        rerender();
        const validTiles = getValidShortcutEndpoints(shortcut.id);
        setInfo(shortcutInfoCardHTML(shortcut, kind, { validTiles }), { isOpen: true });
        // Pre-seleccionar el from/to actual
        const fromSel = document.getElementById("shortcut-from-select");
        const toSel = document.getElementById("shortcut-to-select");
        if (fromSel) fromSel.value = String(shortcut.from_tile ?? "");
        if (toSel) toSel.value = String(shortcut.to_tile ?? "");
        return;
      }
    });

    // Botón "Nuevo atajo" en el header de la card de datos
    const newShortcutBtn = document.getElementById("new-shortcut-btn");
    if (newShortcutBtn) {
      newShortcutBtn.addEventListener("click", () => {
        creatingShortcut = true;
        selected = null;
        rerender();
        const validTiles = getValidShortcutEndpoints(-1);
        setInfo(newShortcutCardHTML({ validTiles }), { isOpen: true });
      });
    }

    // Handlers delegados sobre el contenedor de la card (sobrevive a setInfo).
    const infoContainer = document.querySelector(".board-edit-tile-info");
    if (infoContainer) {
      // Cerrar modal al click en el botón de cerrar (o data-modal-action="close")
      // o click directamente en el backdrop en móviles
      infoContainer.addEventListener("click", (event) => {
        if (event.target === infoContainer) {
          closeInfoModal();
          return;
        }
        const closeBtn = event.target.closest('[data-modal-action="close"]');
        if (closeBtn) {
          closeInfoModal();
          return;
        }
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && infoContainer.classList.contains("board-edit-tile-info--open")) {
          closeInfoModal();
        }
      });
      // Cambia el preview en vivo al cambiar el select
      infoContainer.addEventListener("change", (event) => {
        if (event.target.id !== "tile-type-select") return;
        if (selected?.kind !== "tile") return;
        const newTypeId = Number(event.target.value);
        const tile = tilesByNum.get(selected.id);
        if (!tile) return;
        const preview = document.getElementById("tile-edit-preview");
        if (!preview) return;
        const tempTile = { ...tile, tile_type: newTypeId };
        preview.innerHTML = tilePreviewSVG(tempTile, tileTypesById);
      });

      // Aplica el cambio
      infoContainer.addEventListener("click", async (event) => {
        const applyBtn = event.target.closest("#apply-tile-type");
        if (!applyBtn) return;
        if (selected?.kind !== "tile") return;
        const tile = tilesByNum.get(selected.id);
        if (!tile) return;
        const selectEl = infoContainer.querySelector("#tile-type-select");
        if (!selectEl) return;
        const newTypeId = Number(selectEl.value);
        if (newTypeId === Number(tile.tile_type)) return;

        const originalLabel = applyBtn.textContent;
        applyBtn.disabled = true;
        try {
          const { default: TilesService } = await importWithRetry(
            new URL("../services/tilesService.js", import.meta.url).href
          );
          await new TilesService().update(tile.id, newTypeId);

          const newTt = tileTypesById[newTypeId];
          const updated = {
            ...tile,
            tile_type: newTypeId,
            effect_name: newTt?.effect_name ?? tile.effect_name,
          };
          tilesByNum.set(updated.num_tile, updated);
          tiles = tiles.map((t) => (t.id === updated.id ? updated : t));

          rerender();
          setInfo(tileInfoCardHTML(updated, tileTypes, { isInShortcut: shortcutNums.has(updated.num_tile) }), { isOpen: true });
        } catch (e) {
          applyBtn.textContent = "Error";
          applyBtn.disabled = true;
          console.error(e);
          setTimeout(() => {
            applyBtn.textContent = originalLabel;
            applyBtn.disabled = false;
          }, 1500);
        }
      });

      // Edita un atajo existente
      infoContainer.addEventListener("click", async (event) => {
        const applyBtn = event.target.closest("#apply-shortcut-edit");
        if (!applyBtn) return;
        if (selected?.kind !== "wire" && selected?.kind !== "ladder") return;
        const shortcut = shortcutsById.get(String(selected.id));
        if (!shortcut) return;
        const fromSel = infoContainer.querySelector("#shortcut-from-select");
        const toSel = infoContainer.querySelector("#shortcut-to-select");
        if (!fromSel || !toSel) return;
        const newFrom = Number(fromSel.value);
        const newTo = Number(toSel.value);
        if (newFrom === Number(shortcut.from_tile) && newTo === Number(shortcut.to_tile)) return;
        if (newFrom === newTo) return;

        const originalLabel = applyBtn.textContent;
        applyBtn.disabled = true;
        try {
          const { default: ShortcutsService } = await importWithRetry(
            new URL("../services/shortcutsService.js", import.meta.url).href
          );
          await new ShortcutsService().update(shortcut.id, newFrom, newTo);

          const updated = { ...shortcut, from_tile: newFrom, to_tile: newTo };
          shortcutsById.set(String(updated.id), updated);
          shortcuts = shortcuts.map((s) => (s.id === updated.id ? updated : s));
          shortcutNums.add(newFrom);
          shortcutNums.add(newTo);

          rerender();
          const validTiles = getValidShortcutEndpoints(updated.id);
          setInfo(shortcutInfoCardHTML(updated, selected.kind, { validTiles }), { isOpen: true });
          const fromSel2 = document.getElementById("shortcut-from-select");
          const toSel2 = document.getElementById("shortcut-to-select");
          if (fromSel2) fromSel2.value = String(newFrom);
          if (toSel2) toSel2.value = String(newTo);
        } catch (e) {
          applyBtn.textContent = "Error";
          applyBtn.disabled = true;
          console.error(e);
          setTimeout(() => {
            applyBtn.textContent = originalLabel;
            applyBtn.disabled = false;
          }, 1500);
        }
      });

      // Crea un atajo nuevo
      infoContainer.addEventListener("click", async (event) => {
        const createBtn = event.target.closest("#create-shortcut-btn");
        if (!createBtn) return;
        if (!creatingShortcut) return;
        const fromSel = infoContainer.querySelector("#new-shortcut-from-select");
        const toSel = infoContainer.querySelector("#new-shortcut-to-select");
        if (!fromSel || !toSel) return;
        const newFrom = Number(fromSel.value);
        const newTo = Number(toSel.value);
        if (newFrom === newTo) return;

        const originalLabel = createBtn.textContent;
        createBtn.disabled = true;
        try {
          const { default: ShortcutsService } = await importWithRetry(
            new URL("../services/shortcutsService.js", import.meta.url).href
          );
          const created = await new ShortcutsService().create({
            id_board: idBoard,
            from_tile: newFrom,
            to_tile: newTo,
          });

          shortcuts = [...shortcuts, created];
          shortcutsById.set(String(created.id), created);
          shortcutNums.add(created.from_tile);
          shortcutNums.add(created.to_tile);

          creatingShortcut = false;
          selected = { kind: "wire", id: Number(created.id) };
          rerender();
          const validTiles = getValidShortcutEndpoints(created.id);
          setInfo(shortcutInfoCardHTML(created, "wire", { validTiles }), { isOpen: true });
          const fromSel2 = document.getElementById("shortcut-from-select");
          const toSel2 = document.getElementById("shortcut-to-select");
          if (fromSel2) fromSel2.value = String(newFrom);
          if (toSel2) toSel2.value = String(newTo);
        } catch (e) {
          createBtn.textContent = "Error";
          createBtn.disabled = true;
          console.error(e);
          setTimeout(() => {
            createBtn.textContent = originalLabel;
            createBtn.disabled = false;
          }, 1500);
        }
      });
    }
  }, 0);

  return rendered;
}