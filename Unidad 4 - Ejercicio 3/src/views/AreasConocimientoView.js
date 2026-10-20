import AreaCard from "../components/AreaCard.js";
import { breadcrumbHTML } from "../components/Breadcrumb.js";
import loadTemplate from "../utils/templateLoader.js";
import { getErrorMessage } from "../utils/errorMessage.js";
import { importWithRetry } from "../utils/moduleLoader.js";
import ErrorView from "./ErrorView.js";

export default async function AreasConocimientoView() {
  let areas = [];
  let errorMessage = null;
  try {
    const { default: KnowledgeAreasService } = await importWithRetry(
      new URL("../services/knowledgeAreasService.js", import.meta.url).href
    );
    const service = new KnowledgeAreasService();
    areas = await service.getAll();
  } catch (e) {
    errorMessage = getErrorMessage(e);
  }

  if (errorMessage) {
    return ErrorView({ message: errorMessage });
  }

  const breadcrumb = breadcrumbHTML([
    { label: "Editor de Preguntas", href: "/editar/preguntas" },
    { label: "Áreas del conocimiento" },
  ]);

  const html = await loadTemplate("areas-conocimiento.html", import.meta.url);
  return html
    .replace("{{breadcrumb}}", breadcrumb)
    .replace("{{areas}}", areas.map((a) => AreaCard(a)).join(""));
}
