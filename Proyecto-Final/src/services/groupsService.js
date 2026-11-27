import ApiClient from "./apiClient.js";
import { getApiBaseUrl } from "../config.js";
import { getToken } from "./authService.js";

const client = new ApiClient(getApiBaseUrl());

async function readResponse(response) {
  if (response.ok) return response.json();

  let message = "No se pudo completar la solicitud.";
  try {
    const body = await response.json();
    if (body?.message) message = body.message;
  } catch {
    message = `Error del servidor (${response.status}).`;
  }
  const error = new Error(message);
  error.status = response.status;
  throw error;
}

export default class GroupsService {
  async getAll() {
    return readResponse(await client.get("groups", getToken()));
  }

  async searchUsers(search) {
    return readResponse(
      await client.get(`groups/users?search=${encodeURIComponent(search)}`, getToken())
    );
  }

  async addParticipant(groupId, participantId) {
    return readResponse(
      await client.post(
        `groups/${groupId}/participants`,
        { participantId },
        getToken()
      )
    );
  }

  async addSubtopic(groupId, subtopicId) {
    return readResponse(
      await client.post(
        `groups/${groupId}/subtopics`,
        { subtopicId },
        getToken()
      )
    );
  }

  async create(group) {
    return readResponse(await client.post("groups", group, getToken()));
  }

  async update(id, group) {
    return readResponse(await client.put(`groups/${id}`, group, getToken()));
  }

  async deleteGroup(id) {
    return readResponse(await client.delete(`groups/${id}`, getToken()));
  }

  async removeParticipant(groupId, participantId) {
    return readResponse(
      await client.delete(`groups/${groupId}/participants/${participantId}`, getToken())
    );
  }

  async removeSubtopic(groupId, subtopicId) {
    return readResponse(
      await client.delete(`groups/${groupId}/subtopics/${subtopicId}`, getToken())
    );
  }
}
