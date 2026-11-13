import loadTemplate from "../utils/templateLoader.js";

export default function ContactView() {
  return loadTemplate("contacto.html", import.meta.url);
}