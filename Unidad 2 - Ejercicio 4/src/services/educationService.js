import ApiClient from "./apiClient.js";

const client = new ApiClient("https://wires-and-ladders-api.vercel.app");
export default class EducationService {
  async getAll() {
    const res = await client.get("sync/edu-info-questions");
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async getById(id) {
    const questions = await this.getAll();
    return questions.find(q => String(q.id) === String(id)) ?? null;
  }
}
