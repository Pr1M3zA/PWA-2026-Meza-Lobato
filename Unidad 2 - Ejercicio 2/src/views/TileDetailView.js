import { slugify } from "../utils/slugify.js";
import loadTemplate from "../utils/templateLoader.js";

// Contenido dinámico: detalle de una casilla individual (ruta /tile/:id)

export default async function TileDetailView(params) {
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
        <a href="/editar/tableros" data-link>← Volver al tablero</a>
      </div>
    `;
  }

  if (!tile) {
    return `
      <div class="card">
        <h2>Casilla no encontrada</h2>
        <p>No existe una casilla con id "${params?.id ?? ""}".</p>
        <a href="/editar/tableros" data-link>← Volver al tablero</a>
      </div>
    `;
  }

  const slug = slugify(tile.effect_name ?? "");
  const rows = `
    <dt>Efecto</dt><dd>${tile.effect_name}</dd>
    <dt>ID</dt><dd>${tile.id}</dd>
    <dt>Tablero</dt><dd>${tile.id_board}</dd>
    <dt>Tipo</dt><dd>${tile.tile_type}</dd>
    <dt>Posición</dt><dd>(${tile.pos_x}, ${tile.pos_y})</dd>
    <dt>Rotación</dt><dd>${tile.rotation}°</dd>
    <dt>Radio</dt><dd>${tile.radius}</dd>
    <dt>Ancho de borde</dt><dd>${tile.border_width}</dd>
    <dt>Dirección</dt><dd>${tile.direction}</dd>
  `;

  const html = await loadTemplate("tile-detail.html", import.meta.url);
  return html
    .replace("{{tileSlug}}", slug)
    .replace("{{tileNumber}}", tile.num_tile)
    .replace("{{tileDetail}}", rows);
}