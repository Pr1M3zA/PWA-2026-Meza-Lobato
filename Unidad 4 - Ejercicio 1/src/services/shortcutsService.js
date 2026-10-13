import ApiClient from "./apiClient.js";
import { getApiBaseUrl } from "../config.js";

const client = new ApiClient(getApiBaseUrl());

export default class ShortcutsService {
  async getByBoard(idboard) {
    const res = await client.get(`game/shortcuts/${idboard}`);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }
}