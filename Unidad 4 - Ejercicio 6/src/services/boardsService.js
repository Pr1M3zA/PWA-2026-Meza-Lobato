import ApiClient from "./apiClient.js";
import { getApiBaseUrl } from "../config.js";
import { getToken } from "./authService.js";

const client = new ApiClient(getApiBaseUrl());

export default class BoardsService {
  async getBoards() {
    const token = getToken();
    const res = await client.get("game/boards", token);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async getById(id) {
    const token = getToken();
    const res = await client.get(`game/boards/${id}`, token);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  // Duplica un tablero existente con nombre y descripción nuevos.
  // El backend llama a SP_DUPLICATE_BOARD, que exige ambos textos no vacíos.
  async duplicateBoard(sourceBoardId, boardName, boardDescription) {
    const token = getToken();
    const res = await client.post(
      "game/board",
      {
        source_board: sourceBoardId,
        board_name: boardName,
        board_description: boardDescription,
      },
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
