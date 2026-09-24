import TileCard from "../components/TileCard.js";
import loadTemplate from "../utils/templateLoader.js";
import { getErrorMessage } from "../utils/errorMessage.js";
import { importWithRetry } from "../utils/moduleLoader.js";
import ErrorView from "./ErrorView.js";

const FILTER_KEY = "tableros.tileTypeFilter";

function readFilter() {
  try {
    return sessionStorage.getItem(FILTER_KEY) ?? "";
  } catch (err) {
    console.warn("[TablerosView] no se pudo leer sessionStorage:", err);
    return "";
  }
}

function writeFilter(value) {
  try {
    if (value) sessionStorage.setItem(FILTER_KEY, value);
    else sessionStorage.removeItem(FILTER_KEY);
  } catch (err) {
    console.warn("[TablerosView] no se pudo escribir sessionStorage:", err);
  }
}

function renderTiles(tiles, selectedId) {
  const filtered = selectedId
    ? tiles.filter((t) => String(t.tile_type) === String(selectedId))
    : tiles;
  const html = filtered.map((tile) => TileCard(tile)).join("");
  const countText = selectedId
    ? `${filtered.length} de ${tiles.length} casillas mostradas`
    : `${tiles.length} casillas cargadas desde el endpoint público.`;
  return { html, countText };
}

export default async function TablerosView() {
  let tiles = [];
  let tileTypes = [];
  let errorMessage = null;

  try {
    const { default: TilesService } = await importWithRetry(
      new URL("../services/tilesService.js", import.meta.url).href
    );
    const service = new TilesService();
    [tiles, tileTypes] = await Promise.all([
      service.getAll(),
      service.getTileTypes(),
    ]);
  } catch (e) {
    errorMessage = getErrorMessage(e);
  }

  if (errorMessage) {
    return ErrorView({ message: errorMessage });
  }

  const savedFilter = readFilter();
  const tileTypeOptions = tileTypes
    .map(
      (t) =>
        `<option value="${t.id}"${String(t.id) === savedFilter ? " selected" : ""}>${t.effect_name}</option>`
    )
    .join("");

  const { html: tilesHtml, countText } = renderTiles(tiles, savedFilter);

  const template = await loadTemplate("tableros.html", import.meta.url);
  const rendered = template
    .replace("{{countText}}", countText)
    .replace("{{tileTypeOptions}}", tileTypeOptions)
    .replace("{{tiles}}", tilesHtml);

  setTimeout(() => {
    const select = document.getElementById("tile-type-filter");
    const grid = document.getElementById("tile-grid");
    const lead = document.getElementById("tiles-count");
    if (!select || !grid) return;

    select.addEventListener("change", () => {
      const value = select.value;
      writeFilter(value);
      const next = renderTiles(tiles, value);
      grid.innerHTML = next.html;
      if (lead) lead.textContent = next.countText;
    });
  }, 0);

  return rendered;
}
