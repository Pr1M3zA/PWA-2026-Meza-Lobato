import ApiClient from "./apiClient.js";
import { getApiBaseUrl } from "../config.js";

const client = new ApiClient(getApiBaseUrl());

export default class BackgroundsService {
  async getById(id) {
    const res = await client.get(`game/board-backgrounds/${id}`);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const rows = await res.json();
    return rows[0] ?? null;
  }

  async getAll() {
    const res = await client.get("sync/board-backgrounds");
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }
}