import loadTemplate from "../utils/templateLoader.js";

export default function PreguntasView() {
  return loadTemplate("preguntas.html", import.meta.url);
}