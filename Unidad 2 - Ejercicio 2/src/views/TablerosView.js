import TileCard from "../components/TileCard.js";
import loadTemplate from "../utils/templateLoader.js";

export default async function TablerosView() {
  const { default: TilesService } = await import("../services/tilesService.js");
  const service = new TilesService();

  let tiles = [];
  let error = null;
  try {
    tiles = await service.getAll();
  } catch (e) {
    error = e.message;
  }

  if (error) {
    return `
      <div class="card">
        <h2>Error al cargar las casillas</h2>
        <p style="color:#b91c1c">${error}</p>
        <a href="/" data-link>← Volver al inicio</a>
      </div>
    `;
  }

  const html = await loadTemplate("tableros.html", import.meta.url);
  return html
    .replace("{{tileCount}}", tiles.length)
    .replace("{{tiles}}", tiles.map((tile) => TileCard(tile)).join(""));
}