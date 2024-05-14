import { axiosClient } from "../../apiClient";

const base = "/api-access-token";

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
