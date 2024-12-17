import { axiosClient } from "@/backend/apiClient";

import { LOYALTY_BASE } from "../base";

const actionBaseUrl = LOYALTY_BASE + "/action";

export async function getLoyaltyActions() {
  return (await axiosClient.get(actionBaseUrl)).data;
}

export async function createLoyaltyAction(data) {
  await axiosClient.post(actionBaseUrl, data);
}

export async function updateLoyaltyAction(data, actionId) {
  await axiosClient.put(`${actionBaseUrl}/${actionId}`, data);
}

export async function getLoyaltyActionById(actionId) {
  return (await axiosClient.get(`${actionBaseUrl}/${actionId}`)).data;
}

export async function deleteLoyaltyActionById(actionId) {
  await axiosClient.delete(`${actionBaseUrl}/${actionId}`);
}

interface referalProps {
  referralCode: string;
  refereePhone: string;
  refereeName?: string;
  amount?: number;
}

export async function referralLoyaltyAction({
  referralCode,
  refereePhone,
  refereeName,
  amount,
}: referalProps) {
  await axiosClient.post(`${actionBaseUrl}/${referralCode}`, {
    refereePhone,
    refereeName,
    amount,
  });
}
