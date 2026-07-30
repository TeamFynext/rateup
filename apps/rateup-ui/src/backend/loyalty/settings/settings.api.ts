import { axiosClient } from "@/backend/apiClient";
import type { RequestPayload } from "@/types/api.ts";

import { LOYALTY_BASE } from "../base.ts";

const base = LOYALTY_BASE + "/settings";

export async function createLoyaltyTemplate(data: RequestPayload) {
  await axiosClient.post(`${base}/template`, data);
}

export async function updateLoyaltyTemplate(id: string, data: any) {
  await axiosClient.put(`${base}/template/${id}`, data);
}

export async function deleteLoyaltyTemplate(id: string) {
  await axiosClient.delete(`${base}/template/${id}`);
}

export async function getLoyaltyTemplate(id: string) {
  return (await axiosClient.get(`${base}/template/${id}`)).data;
}

export async function getAllLoyaltyTemplates() {
  return (await axiosClient.get(`${base}/template/all`)).data;
}
