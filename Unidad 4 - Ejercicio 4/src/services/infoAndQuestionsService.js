import ApiClient from "./apiClient.js";
import { getApiBaseUrl } from "../config.js";
import { getToken } from "./authService.js";

const client = new ApiClient(getApiBaseUrl());

export default class InfoAndQuestionsService {
  async getBySubtopic(idsubtopic) {
    const token = getToken();
    const res = await client.get(`education/info-and-questions-full/${idsubtopic}`, token);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async create({ id_subtopic, information, question, answer_1, answer_2, answer_3, answer_4, answer_ok }) {
    const token = getToken();
    const res = await client.post(
      "education/info-and-questions",
      { id_subtopic, information, question, answer_1, answer_2, answer_3, answer_4, answer_ok },
      token
    );
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async update({ id, id_subtopic, information, question, answer_1, answer_2, answer_3, answer_4, answer_ok }) {
    const token = getToken();
    const res = await client.put(
      "education/info-and-questions",
      { id, id_subtopic, information, question, answer_1, answer_2, answer_3, answer_4, answer_ok },
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
    const res = await client.delete(`education/info-and-questions/${id}`, token);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }
}
