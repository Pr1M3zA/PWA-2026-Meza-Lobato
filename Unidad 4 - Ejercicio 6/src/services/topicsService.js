import ApiClient from "./apiClient.js";
import { getApiBaseUrl } from "../config.js";
import { getToken } from "./authService.js";

const client = new ApiClient(getApiBaseUrl());

export default class TopicsService {
  async getByDisciplineAndLevel(iddisc, idlevel) {
    const token = getToken();
    const res = await client.get(`education/topics/${iddisc}/${idlevel}`, token);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async getById(idtopic) {
    const token = getToken();
    const res = await client.get(`education/topics/${idtopic}`, token);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const rows = await res.json();
    return rows[0] ?? null;
  }

  async create({ id_discipline, id_level, description, details }) {
    const token = getToken();
    const res = await client.post(
      "education/topics",
      { id_discipline, id_level, description, details },
      token
    );
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async update({ id, id_level, description, details }) {
    const token = getToken();
    const res = await client.put(
      "education/topics",
      { id, id_level, description, details },
      token
    );
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async delete(id) {
    const token = getToken();
    const res = await client.delete(`education/topics/${id}`, token);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }
}
