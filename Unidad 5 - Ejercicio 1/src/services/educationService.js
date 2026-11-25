import ApiClient from "./apiClient.js";
import { getApiBaseUrl } from "../config.js";

const client = new ApiClient(getApiBaseUrl());
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
}
