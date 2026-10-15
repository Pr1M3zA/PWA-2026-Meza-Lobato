import ApiClient from "./apiClient.js";
import { getApiBaseUrl } from "../config.js";

const client = new ApiClient(getApiBaseUrl());

export default class TilesService {
  async getAll() {
    const res = await client.get("sync/tiles");
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async getById(id) {
    const res = await client.get(`sync/tile/${id}`);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const rows = await res.json();
    return rows[0] ?? null;
  }

  async getByBoard(idboard) {
    const res = await client.get(`game/tiles/${idboard}`);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async getTileTypes() {
    const res = await client.get("sync/tile-types");
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }
}
