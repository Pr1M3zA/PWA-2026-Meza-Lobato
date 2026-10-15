// Pieza del contenido dinamico renderizado por las vistas dentro de <main id="app">.
// Card embebida en BoardEditView que muestra los datos basicos de la casilla
// seleccionada en el preview SVG (num_tile, pos_x/pos_y, effect_name).

import { escapeXml } from "../../utils/svg.js";

export function tileInfoCardHTML(tile) {
  if (!tile) return tileInfoEmptyHTML();
  const num = tile.num_tile ?? "";
  const posX = tile.pos_x ?? 0;
  const posY = tile.pos_y ?? 0;
  const effect = escapeXml(tile.effect_name ?? "");
  return `
    <div class="tile-info-card" id="board-edit-tile-info">
      <span class="tile-badge">Casilla #${escapeXml(String(num))}</span>
      <h3 class="tile-name">${effect}</h3>
      <p class="tile-meta">Pos: (${escapeXml(String(posX))}, ${escapeXml(String(posY))})</p>
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