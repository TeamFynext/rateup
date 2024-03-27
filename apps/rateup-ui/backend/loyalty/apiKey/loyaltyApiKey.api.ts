import { axiosClient } from "../../apiClient";
import { LOYALTY_BASE } from "../base";

const base = LOYALTY_BASE + "/api-key";

export async function createApiKey() {
  const res = await axiosClient.post(base);
  return res.data as { apiKey: string };
}
export async function deleteApiKey() {
  const res = await axiosClient.delete(base);
  return res.data;
}

export async function regenerateApiKey() {
  const res = await axiosClient.post(base + "/regenerate");
  return res.data as { apiKey: string };
}

export async function getApiKeyCreatedAt() {
  const res = await axiosClient.get(base);
  return res.data as { createdAt: string };
}
