// Pieza del contenido dinamico renderizado por las vistas dentro de <main id="app">.
// Port de web/src/app/components/HexTile.tsx: casilla hexagonal con paths del
// tipo de efecto, numero y flecha de direccion. Toma `tileTypes` por argumento
// (el original lo leia de un Context; la PWA no tiene Context).

import hexagonHTML from "./Hexagon.js";
import { escapeXml } from "../../utils/svg.js";

export default function hexTileHTML(tile, tileTypes, { selected, isEditMode } = {}) {
  const tt = tileTypes[tile.tile_type];

  let selection = '';
  if (selected) {
    selection = `<circle cx="0" cy="0" r="${tile.radius + 8}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-dasharray="5,3" />`;
  }

  let direction = '';
  if (tile.direction !== 0) {
    const sqrt = Math.sqrt(3) * tile.radius / 2;
    direction = `<g transform="rotate(${-tile.direction})"><polygon points="0 ${-tile.radius / 4} ${-tile.radius / 4} 0 ${tile.radius / 4} 0" fill="${escapeXml(tt.color_border)}" stroke="${escapeXml(tt.color_fill)}" stroke-width="1" transform="translate(${sqrt - tile.border_width}, 0) rotate(90)" /></g>`;
  }

  return `<g data-num-tile="${escapeXml(String(tile.num_tile))}" transform="translate(${tile.pos_x}, ${tile.pos_y})" style="cursor:${isEditMode ? 'pointer' : 'default'}">${selection}${hexagonHTML({ pos: { x: 0, y: 0 }, radius: tile.radius, rotation: tile.rotation, colors: { fill: tt.color_fill, border: tt.color_border }, borderWidth: tile.border_width })}<g transform="translate(${tt.paths_x}, ${tt.paths_y}) scale(${tt.paths_scale})"><path fill="${escapeXml(tt.color_path1)}" fill-rule="evenodd" clip-rule="evenodd" d="${escapeXml(tt.path1)}" /><path fill="${escapeXml(tt.color_path2)}" fill-rule="evenodd" clip-rule="evenodd" d="${escapeXml(tt.path2)}" /></g><text x="0" y="${-tile.radius / 3}" text-anchor="middle" font-size="20" fill="white" style="font-family:'Jomhuria',serif;font-size:24px">${escapeXml(tile.num_tile)}</text>${direction}</g>`;
}