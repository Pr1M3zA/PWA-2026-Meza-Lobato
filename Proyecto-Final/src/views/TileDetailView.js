import { slugify } from "../utils/slugify.js";
import loadTemplate from "../utils/templateLoader.js";
import { getErrorMessage } from "../utils/errorMessage.js";
import { importWithRetry } from "../utils/moduleLoader.js";
import ErrorView from "./ErrorView.js";

// Contenido dinámico: detalle de una casilla individual (ruta /tile/:id)

export default async function TileDetailView(params) {
  let tile = null;
  let errorMessage = null;
  try {
    const { default: TilesService } = await importWithRetry(
      new URL("../services/tilesService.js", import.meta.url).href
    );
    const service = new TilesService();
    tile = await service.getById(params.id);
  } catch (e) {
    errorMessage = getErrorMessage(e);
  }

  if (errorMessage) {
    return ErrorView({ message: errorMessage });
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
