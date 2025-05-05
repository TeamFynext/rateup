import { axiosClient } from "@/backend/apiClient";

import { LOYALTY_BASE } from "../base";

const base = `${LOYALTY_BASE}/api-settings`;

export async function getAllLoyaltyApiSettings() {
  return (await axiosClient.get(base)).data as LoyaltyApiSetting[];
}

export async function createLoyaltyApiSettings(
  data: Omit<LoyaltyApiSetting, "orgId" | "id" | "action">,
) {
  return (await axiosClient.post(base, data)).data;
}

export async function updateLoyaltyApiSettings(
  data: Partial<Omit<LoyaltyApiSetting, "orgId">>,
  id: string,
) {
  return (await axiosClient.put(`${base}/${id}`, data)).data;
}

export async function getLoyaltyApiSettings(id: string) {
  return (await axiosClient.get(`${base}/${id}`)).data as LoyaltyApiSetting;
}
