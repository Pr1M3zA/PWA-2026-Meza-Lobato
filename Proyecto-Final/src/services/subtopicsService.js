import ApiClient from "./apiClient.js";
import { getApiBaseUrl } from "../config.js";
import { getToken } from "./authService.js";

const client = new ApiClient(getApiBaseUrl());

export default class SubtopicsService {
  async getByTopic(idtopic) {
    const token = getToken();
    const res = await client.get(`education/subtopics/${idtopic}`, token);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async getById(idsubtopic) {
    const token = getToken();
    const res = await client.get(`education/subtopic/${idsubtopic}`, token);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const rows = await res.json();
    return rows[0] ?? null;
  }

  async create({ id_topic, description, details }) {
    const token = getToken();
    const res = await client.post(
      "education/subtopics",
      { id_topic, description, details },
      token
    );
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async update({ id, id_topic, description, details }) {
    const token = getToken();
    const res = await client.put(
      "education/subtopics",
      { id, id_topic, description, details },
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
    const res = await client.delete(`education/subtopics/${id}`, token);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }
}
