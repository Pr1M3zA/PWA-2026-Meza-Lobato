import { slugify } from "../utils/slugify.js";

// Pieza del contenido dinámico renderizado por las vistas dentro de <main id="app">.

export default function TileCard(tile) {
  const slug = slugify(tile.effect_name ?? "");

  return `
    <article class="card tile-item" data-slug="${slug}">
      <span class="tile-badge">Casilla #${tile.num_tile}</span>
      <h3 class="tile-name">${tile.effect_name}</h3>
      <p class="tile-meta">Tipo: ${tile.tile_type} | Pos: (${tile.pos_x}, ${tile.pos_y})</p>
      <p class="tile-meta">Rotación: ${tile.rotation}° | Radio: ${tile.radius}</p>
      <a class="tile-link" href="/tile/${tile.id}" data-link>Ver detalle →</a>
    </article>
  `;
}