const API_URL = "https://wires-and-ladders-api.vercel.app/sync/education";

export default class EducationService {
  async getAll() {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Error al obtener las preguntas");
    return res.json();
  }

  async getById(id) {
    const questions = await this.getAll();
    return questions.find((q) => String(q.id) === String(id)) ?? null;
  }
}