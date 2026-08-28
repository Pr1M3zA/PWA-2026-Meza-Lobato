import TileCard from "../components/TileCard.js";

const API_URL = "https://wires-and-ladders-api.vercel.app/sync/tiles";

export default async function HomeView() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error("Error al obtener las casillas");
  const tiles = await res.json();

  return `
    <h2>Tablero</h2>
    <div class="grid">
      ${tiles.map((tile) => TileCard(tile)).join("")}
    </div>
  `;
}
