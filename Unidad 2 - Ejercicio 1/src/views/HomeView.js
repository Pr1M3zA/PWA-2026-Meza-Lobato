import loadTemplate from "../utils/templateLoader.js";

export default function HomeView() {
  return loadTemplate("home.html", import.meta.url);
}