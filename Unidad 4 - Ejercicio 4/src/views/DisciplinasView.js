import DisciplineCard from "../components/DisciplineCard.js";
import { breadcrumbHTML } from "../components/Breadcrumb.js";
import loadTemplate from "../utils/templateLoader.js";
import { getErrorMessage } from "../utils/errorMessage.js";
import { importWithRetry } from "../utils/moduleLoader.js";
import ErrorView from "./ErrorView.js";

export default async function DisciplinasView(params) {
  const idka = params?.idka;
  let disciplines = [];
  let area = null;
  let errorMessage = null;

  try {
    const [{ default: DisciplinesService }, { default: KnowledgeAreasService }] =
      await Promise.all([
        importWithRetry(
          new URL("../services/disciplinesService.js", import.meta.url).href
        ),
        importWithRetry(
          new URL("../services/knowledgeAreasService.js", import.meta.url).href
        ),
      ]);

    const disciplinesService = new DisciplinesService();
    const areasService = new KnowledgeAreasService();
    const [discList, areaResult] = await Promise.all([
      disciplinesService.getByArea(idka),
      areasService.getById(idka),
    ]);
    disciplines = discList;
    area = areaResult;
  } catch (e) {
    errorMessage = getErrorMessage(e);
  }

  if (errorMessage) {
    return ErrorView({ message: errorMessage });
  }

  if (!area) {
    return `
      <div class="card">
        <h2>Área no encontrada</h2>
        <p>No existe un área de conocimiento con id "${idka ?? ""}".</p>
        <a href="/editar/preguntas" data-link>← Volver a áreas</a>
      </div>
    `;
  }

  const subtitulo = `Disciplinas de ${area.description}. Selecciona una para ver sus temas.`;
  const areaColor = area.color;
  const cards = disciplines.map((d) => DisciplineCard(d, areaColor)).join("");

  const breadcrumb = breadcrumbHTML([
    { label: "Editor de Preguntas", href: "/editar/preguntas" },
    { label: area.description },
  ]);

  const html = await loadTemplate("disciplinas.html", import.meta.url);
  return html
    .replace("{{breadcrumb}}", breadcrumb)
    .replace("{{subtitulo}}", subtitulo)
    .replace("{{disciplines}}", cards);
}
