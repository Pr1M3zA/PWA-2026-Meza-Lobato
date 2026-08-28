// Cumple Req. 5 - Uso 2/2 de (slugify)
import { slugify } from "../utils/slugify.js";

export default async function TileDetailView(params) {
  // Cumple Req.7 - Import dinámico dentro de la vista 
  const { default: TilesService } = await import("../services/tilesService.js");
  const service = new TilesService();

  let tile = null;
  let error = null;
  try {
    tile = await service.getById(params.id);
  } catch (e) {
    error = e.message;
  }

  if (error) {
    return `
      <div class="card">
        <h2>Error al cargar la casilla</h2>
        <p style="color:#b91c1c">${error}</p>
        <a href="/" data-link>← Volver al tablero</a>
      </div>
    `;
  }

  if (!tile) {
    return `
      <div class="card">
        <h2>Casilla no encontrada</h2>
        <p>No existe una casilla con id "${params?.id ?? ""}".</p>
        <a href="/" data-link>← Volver al tablero</a>
      </div>
    `;
  }

  const slug = slugify(tile.effect_name ?? "");

  return `
    <div class="card" data-slug="${slug}">
      <h2>Casilla #${tile.num_tile}</h2>
      <p><strong>Efecto:</strong> ${tile.effect_name}</p>
      <p><strong>ID:</strong> ${tile.id} | <strong>Tablero:</strong> ${tile.id_board}</p>
      <p><strong>Tipo:</strong> ${tile.tile_type}</p>
      <p><strong>Posición:</strong> (${tile.pos_x}, ${tile.pos_y})</p>
      <p><strong>Rotación:</strong> ${tile.rotation}°</p>
      <p><strong>Radio:</strong> ${tile.radius}</p>
      <p><strong>Ancho de borde:</strong> ${tile.border_width}</p>
      <p><strong>Dirección:</strong> ${tile.direction}</p>
      <a href="/" data-link>← Volver al tablero</a>
    </div>
  `;
}
