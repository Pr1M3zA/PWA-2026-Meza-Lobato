import ApiClient from "./apiClient.js";
import { getApiBaseUrl } from "../config.js";
import { getToken } from "./authService.js";

const client = new ApiClient(getApiBaseUrl());

export default class TilesService {
  async getAll() {
    const token = getToken();
    const res = await client.get("sync/tiles", token);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async getById(id) {
    const token = getToken();
    const res = await client.get(`sync/tile/${id}`, token);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const rows = await res.json();
    return rows[0] ?? null;
  }

  async getByBoard(idboard) {
    const token = getToken();
    const res = await client.get(`game/tiles/${idboard}`, token);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async getTileTypes() {
    const token = getToken();
    const res = await client.get("sync/tile-types", token);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async update(id, tile_type) {
    const token = getToken();
    const res = await client.put("game/tile", { id, tile_type }, token);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }
}
