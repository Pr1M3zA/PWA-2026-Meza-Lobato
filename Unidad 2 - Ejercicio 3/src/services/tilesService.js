import ApiClient from "./apiClient.js";

const client = new ApiClient("https://wires-and-ladders-api.vercel.app/sync");

export default class TilesService {
  async getAll() {
    const res = await client.get("tiles");
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async getById(id) {
    const tiles = await this.getAll();
    return tiles.find(t => String(t.id) === String(id)) ?? null;
  }
}
