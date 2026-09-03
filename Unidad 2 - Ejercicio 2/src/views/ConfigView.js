import loadTemplate from "../utils/templateLoader.js";

export default function ConfigView() {
  return loadTemplate("config.html", import.meta.url);
}