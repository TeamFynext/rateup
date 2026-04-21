import { axiosClient } from "@/backend/apiClient";

import { LOYALTY_BASE } from "../base";

const base = LOYALTY_BASE + "/settings";

export async function createLoyaltyTemplate(data) {
  await axiosClient.post(`${base}/template`, data);
}

export async function updateLoyaltyTemplate(id: string, data: any) {
  await axiosClient.put(`${base}/template/${id}`, data);
}

export async function deleteLoyaltyTemplate(id: string) {
  await axiosClient.delete(`${base}/template/${id}`);
}

export async function getLoyaltyTemplate(id) {
  return (await axiosClient.get(`${base}/template/${id}`)).data;
}

export async function getAllLoyaltyTemplates() {
  return (await axiosClient.get(`${base}/template/all`)).data;
}
