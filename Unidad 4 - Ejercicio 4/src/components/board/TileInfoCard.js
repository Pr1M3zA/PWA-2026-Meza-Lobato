// Pieza del contenido dinamico renderizado por las vistas dentro de <main id="app">.
// Card embebida en BoardEditView que muestra los datos basicos de la casilla
// seleccionada en el preview SVG (num_tile, pos_x/pos_y, effect_name) y un
// mini form de edicion (preview + dropdown + aplicar) si la casilla es
// editable (no es Inicio/Meta y no es "Ninguno" siendo origen/destino de un
// atajo).

import { escapeXml } from "../../utils/svg.js";
import hexTileHTML from "./HexTile.js";

const EXCLUDED_EFFECTS = new Set(["Inicio", "Meta"]);
const NINGUNO = "Ninguno";

function uniqueEffectTypes(tileTypes) {
  const seen = new Map();
  for (const tt of tileTypes) {
    if (!tt) continue;
    if (EXCLUDED_EFFECTS.has(tt.effect_name)) continue;
    if (!seen.has(tt.effect_name)) seen.set(tt.effect_name, tt.id);
  }
  return Array.from(seen.entries());
}

export function tilePreviewSVG(tile, tileTypes) {
  const r = Number(tile?.radius) || 40;
  const padding = 8;
  const vb = (r + padding) * 2;
  const ttDict = Array.isArray(tileTypes)
    ? Object.fromEntries(tileTypes.map((tt) => [tt.id, tt]))
    : tileTypes || {};
  const previewTile = { ...tile, pos_x: 0, pos_y: 0 };
  return `<svg viewBox="${-r - padding} ${-r - padding} ${vb} ${vb}" width="96" height="96" aria-hidden="true">${hexTileHTML(previewTile, ttDict, { selected: false, isEditMode: false })}</svg>`;
}

export function tileInfoCardHTML(tile, tileTypes, { isInShortcut = false } = {}) {
  if (!tile) return tileInfoEmptyHTML();
  const num = tile.num_tile ?? "";
  const posX = tile.pos_x ?? 0;
  const posY = tile.pos_y ?? 0;
  const effect = escapeXml(tile.effect_name ?? "");
  const effectName = tile.effect_name ?? "";
  const isNinguno = effectName === NINGUNO;
  const isStartFinish = EXCLUDED_EFFECTS.has(effectName);
  const isBlocked = isStartFinish || (isNinguno && isInShortcut);

  const blockedMsg = isStartFinish
    ? `Esta casilla es de tipo "${effectName}" y no se puede editar.`
    : "La casilla es origen o destino de un atajo. Cambia primero el atajo.";

  const options = uniqueEffectTypes(tileTypes)
    .map(([name, id]) => `<option value="${escapeXml(String(id))}"${String(id) === String(tile.tile_type) ? " selected" : ""}>${escapeXml(name)}</option>`)
    .join("");

  const disabledAttr = isBlocked ? "disabled" : "";

  return `
    <div class="tile-info-card tile-info-card--split" id="board-edit-tile-info">
      <button type="button" class="modal-close" data-modal-action="close" title="Cerrar" aria-label="Cerrar">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
      <div class="tile-info-card__left">
        <span class="tile-badge">Casilla #${escapeXml(String(num))}</span>
        <div class="tile-info-effect">
          <span class="form-label">Efecto actual:</span>
          <h3 class="tile-name">${effect}</h3>
        </div>
        <p class="tile-meta">Pos: (${escapeXml(String(posX))}, ${escapeXml(String(posY))})</p>
        ${isBlocked
      ? `<p class="tile-edit-blocked">${escapeXml(blockedMsg)}</p>`
      : `<div class="form-field">
              <label class="form-label" for="tile-type-select">Cambiar efecto a:</label>
              <div class="tile-edit-row">
                <select id="tile-type-select" class="form-input" ${disabledAttr}>${options}</select>
                <button type="button" class="modal-btn modal-btn-primary" id="apply-tile-type" ${disabledAttr}>Aplicar</button>
              </div>
            </div>`}
      </div>
      <div class="tile-info-card__right">
        <div class="tile-edit-preview" id="tile-edit-preview">${tilePreviewSVG(tile, tileTypes)}</div>
      </div>
    </div>
  `;
}

export function tileInfoEmptyHTML() {
  return `
    <div class="tile-info-card tile-info-card--empty" id="board-edit-tile-info">
      <p class="tile-info-empty">Selecciona una casilla del preview para ver sus datos.</p>
    </div>
  `;
}

export function shortcutInfoCardHTML(shortcut, kind, { validTiles = [] } = {}) {
  if (!shortcut) return tileInfoEmptyHTML();
  const id = shortcut.id ?? "";
  const from = shortcut.from_tile ?? "";
  const to = shortcut.to_tile ?? "";
  const label = kind === "wire" ? "Cable (serpiente)" : "Escalera";

  const optionsHTML = validTiles
    .map((t) => `<option value="${escapeXml(String(t.num_tile))}">Casilla #${escapeXml(String(t.num_tile))}</option>`)
    .join("");

  return `
    <div class="tile-info-card" id="board-edit-tile-info">
      <button type="button" class="modal-close" data-modal-action="close" title="Cerrar" aria-label="Cerrar">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
      <span class="tile-badge">${label} #${escapeXml(String(id))}</span>
      <h3 class="tile-name">Conecta casillas</h3>
      <p class="tile-meta">Atajo actual: #${escapeXml(String(from))} → #${escapeXml(String(to))}</p>
      <div class="shortcut-endpoints-row">
        <div class="form-field">
          <label class="form-label" for="shortcut-from-select">Cambiar origen a:</label>
          <select id="shortcut-from-select" class="form-input">${optionsHTML}</select>
        </div>
        <div class="form-field">
          <label class="form-label" for="shortcut-to-select">Cambiar destino a:</label>
          <select id="shortcut-to-select" class="form-input">${optionsHTML}</select>
        </div>
      </div>
      <div class="tile-edit-row modal-actions">
        <button type="button" class="modal-btn modal-btn-secondary" data-modal-action="close">Cancelar</button>
        <button type="button" class="modal-btn modal-btn-primary" id="apply-shortcut-edit">Aplicar</button>
      </div>
    </div>
  `;
}

export function newShortcutCardHTML({ validTiles = [] } = {}) {
  const optionsHTML = validTiles
    .map((t) => `<option value="${escapeXml(String(t.num_tile))}">Casilla #${escapeXml(String(t.num_tile))}</option>`)
    .join("");

  return `
    <div class="tile-info-card" id="board-edit-tile-info">
      <button type="button" class="modal-close" data-modal-action="close" title="Cerrar" aria-label="Cerrar">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
      <span class="tile-badge">Nuevo atajo</span>
      <h3 class="tile-name">Conectar dos casillas</h3>
      <p class="tile-meta">Origen y destino deben ser casillas con efecto "Ninguno" que no sean origen de otro atajo.</p>
      <div class="shortcut-endpoints-row">
        <div class="form-field">
          <label class="form-label" for="new-shortcut-from-select">Origen</label>
          <select id="new-shortcut-from-select" class="form-input">${optionsHTML}</select>
        </div>
        <div class="form-field">
          <label class="form-label" for="new-shortcut-to-select">Destino</label>
          <select id="new-shortcut-to-select" class="form-input">${optionsHTML}</select>
        </div>
      </div>
      <div class="tile-edit-row modal-actions">
        <button type="button" class="modal-btn modal-btn-secondary" data-modal-action="close">Cancelar</button>
        <button type="button" class="modal-btn modal-btn-primary" id="create-shortcut-btn">Crear</button>
      </div>
    </div>
  `;
}
