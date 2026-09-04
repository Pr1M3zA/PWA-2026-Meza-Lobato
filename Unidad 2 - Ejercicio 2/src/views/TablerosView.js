import TileCard from "../components/TileCard.js";
import loadTemplate from "../utils/templateLoader.js";
import { getErrorMessage } from "../utils/errorMessage.js";
import { importWithRetry } from "../utils/moduleLoader.js";
import ErrorView from "./ErrorView.js";

export default async function TablerosView() {
  let tiles = [];
  let errorMessage = null;
  try {
    const { default: TilesService } = await importWithRetry(
      new URL("../services/tilesService.js", import.meta.url).href
    );
    const service = new TilesService();
    tiles = await service.getAll();
  } catch (e) {
    errorMessage = getErrorMessage(e);
  }

  if (errorMessage) {
    return ErrorView({ message: errorMessage });
  }

  const html = await loadTemplate("tableros.html", import.meta.url);
  return html
    .replace("{{tileCount}}", tiles.length)
    .replace("{{tiles}}", tiles.map((tile) => TileCard(tile)).join(""));
}
