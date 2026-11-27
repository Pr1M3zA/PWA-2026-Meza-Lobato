import loadTemplate from "../utils/templateLoader.js";

export default function EditView() {
  return loadTemplate("editar.html", import.meta.url);
}