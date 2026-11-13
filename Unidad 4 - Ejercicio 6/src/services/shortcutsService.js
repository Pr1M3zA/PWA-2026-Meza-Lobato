import ApiClient from "./apiClient.js";
import { getApiBaseUrl } from "../config.js";
import { getToken } from "./authService.js";

const client = new ApiClient(getApiBaseUrl());

export default class ShortcutsService {
  async getByBoard(idboard) {
    const token = getToken();
    const res = await client.get(`game/shortcuts/${idboard}`, token);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async create({ id_board, from_tile, to_tile }) {
    const token = getToken();
    const res = await client.post(
      "game/shortcut",
      { id_board, from_tile, to_tile },
      token
    );
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async update(id, from_tile, to_tile) {
    const token = getToken();
    const res = await client.put(
      "game/shortcut",
      { id, from_tile, to_tile },
      token
    );
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }
}
