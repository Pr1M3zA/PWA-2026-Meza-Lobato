const API_URL = "https://wires-and-ladders-api.vercel.app/sync/tiles";
export default class TilesService {
  async getAll() {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Error al obtener las casillas");
    return res.json();
  }

  async getById(id) {
    const tiles = await this.getAll();
    return tiles.find((t) => String(t.id) === String(id)) ?? null;
  }
}
