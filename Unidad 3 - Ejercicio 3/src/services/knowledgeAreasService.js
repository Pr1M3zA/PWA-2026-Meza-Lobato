import ApiClient from "./apiClient.js";
import { getApiBaseUrl } from "../config.js";
import { getToken } from "./authService.js";

const client = new ApiClient(getApiBaseUrl());

export default class KnowledgeAreasService {
  async getAll() {
    const res = await client.get("education/knowledge_areas", getToken());
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async getById(id) {
    const token = getToken();
    const res = await client.get(`education/knowledge_area/${id}`, token);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const rows = await res.json();
    return rows[0] ?? null;
  }
}
