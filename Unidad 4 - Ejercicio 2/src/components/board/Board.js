// Pieza del contenido dinamico renderizado por las vistas dentro de <main id="app">.
// Port de web/src/app/Board.tsx: composicion del SVG completo del tablero
// (background, tiles con o sin StartFinishLine, wires, ladders).
// Toma los datos crudos de los endpoints y devuelve el string SVG final.

import Background from "./Background.js";
import HexTile from "./HexTile.js";
import Ladder from "./Ladder.js";
import Wire from "./Wire.js";
import StartFinishLine from "./StartFinishLine.js";
import {
  ladderRungDef,
  escamasPatternDef,
  backgroundPatternDef,
} from "../../utils/svg.js";

const WIRE_COLOR = { fill: "green", border: "black" };
const LADDER_COLOR = { base: "sandybrown", rung: "saddlebrown" };

export default function Board({ board, background, tiles, tileTypes, shortcuts, selectedNumTile = null }) {
  const width = board.width || 400;
  const height = board.height || 2000;

  // El endpoint /sync/tile-types devuelve un array; tile.tile_type apunta
  // al `id` de la fila (no al indice). Convertimos a dict por id para que
  // tileTypes[tile.tile_type] funcione aunque los ids no sean 0-based contiguos.
  const tileTypesById = Array.isArray(tileTypes)
    ? Object.fromEntries(tileTypes.map((tt) => [tt.id, tt]))
    : tileTypes;

  const tilesByNum = new Map(tiles.map((t) => [t.num_tile, t]));

  const wires = shortcuts.filter((s) => s.from_tile > s.to_tile);
  const ladders = shortcuts.filter((s) => s.to_tile > s.from_tile);

  let defs =
    ladderRungDef(LADDER_COLOR.rung, LADDER_COLOR.base) +
    escamasPatternDef(WIRE_COLOR.fill, WIRE_COLOR.border);

  let backgroundMarkup = "";
  if (background) {
    defs += backgroundPatternDef(
      background.rect_width,
      background.rect_height,
      {
        color1: background.color_rect,
        color2: background.color_path1,
        color3: background.color_path2,
      },
      background.path1,
      background.path2
    );
    backgroundMarkup = Background({ width, height });
  }

  const tilesMarkup = tiles
    .map((tile) => {
      if (tile.effect_name === "Inicio" || tile.effect_name === "Meta") {
        return StartFinishLine({
          pos: { x: tile.pos_x, y: tile.pos_y },
          size: { width: width - tile.pos_x, height: tile.radius },
          color: {
            fill: tileTypesById[tile.tile_type].color_fill,
            border: tileTypesById[tile.tile_type].color_border,
          },
        });
      }
      return HexTile(tile, tileTypesById, { selected: tile.num_tile === selectedNumTile, isEditMode: true });
    })
    .join("");

  const wiresMarkup = wires
    .map((s) => {
      const a = tilesByNum.get(s.from_tile);
      const b = tilesByNum.get(s.to_tile);
      if (!a || !b) return "";
      return Wire({
        from: { x: a.pos_x, y: a.pos_y },
        to: { x: b.pos_x, y: b.pos_y },
        width: 10,
      });
    })
    .join("");

  const laddersMarkup = ladders
    .map((s) => {
      const a = tilesByNum.get(s.from_tile);
      const b = tilesByNum.get(s.to_tile);
      if (!a || !b) return "";
      return Ladder({
        from: { x: a.pos_x, y: a.pos_y },
        to: { x: b.pos_x, y: b.pos_y },
        scale: 1,
        color: LADDER_COLOR,
      });
    })
    .join("");

  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">${defs}<g transform="scale(1)">${backgroundMarkup}${tilesMarkup}${wiresMarkup}${laddersMarkup}</g></svg>`;
}