import { axiosClient } from "@/backend/apiClient";
import { LoyaltyTemplateTypes } from "@/components/loyalty/LoyaltySettings";

import { LOYALTY_BASE } from "../base";

const base = LOYALTY_BASE + "/settings";

export async function createLoyaltyTemplate(data) {
  await axiosClient.post(`${base}/template`, data);
}
export type UpdateLoyaltyTemplate = {
  waTemplateId?: string;
};

export async function updateLoyaltyTemplate(
  type: LoyaltyTemplateTypes,
  data: UpdateLoyaltyTemplate,
) {
  await axiosClient.put(`${base}/template?type=${type}`, data);
}

export async function getLoyaltyTemplate(type: LoyaltyTemplateTypes) {
  return (await axiosClient.get(`${base}/template?type=${type}`)).data;
}

export async function getAllLoyaltyTemplates() {
  return (await axiosClient.get(`${base}/template/all`)).data;
}
