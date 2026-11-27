import loadTemplate from "../utils/templateLoader.js";

export default function NotFoundView() {
  return loadTemplate("not-found.html", import.meta.url);
}