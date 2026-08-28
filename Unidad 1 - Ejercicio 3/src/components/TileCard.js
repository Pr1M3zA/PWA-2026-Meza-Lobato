// Cumple Req. 5 - Uso 1/2 de (slugify)
import { slugify } from "../utils/slugify.js";

export default function TileCard(tile) {
  const slug = slugify(tile.effect_name ?? "");

  return `
    <article class="card" data-slug="${slug}">
      <h3>Casilla #${tile.num_tile}</h3>
      <p><strong>${tile.effect_name}</strong></p>
      <p>Tipo: ${tile.tile_type} | Pos: (${tile.pos_x}, ${tile.pos_y})</p>
      <p><small>Rotación: ${tile.rotation}° | Radio: ${tile.radius}</small></p>
      <a href="/tile/${tile.id}" data-link>Ver detalle →</a>
    </article>
  `;
}
