import loadTemplate from "../utils/templateLoader.js";

export default function AboutView() {
  return loadTemplate("acerca.html", import.meta.url);
}