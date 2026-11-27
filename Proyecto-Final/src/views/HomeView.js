import loadTemplate from "../utils/templateLoader.js";

export default async function HomeView() {
  return loadTemplate("home.html", import.meta.url);
}
