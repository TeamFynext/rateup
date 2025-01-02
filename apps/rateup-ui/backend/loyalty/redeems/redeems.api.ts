import { axiosClient } from "@/backend/apiClient";

import { LOYALTY_BASE } from "../base";

const base = LOYALTY_BASE + "/redeem";

export async function getLoyaltyRedeems() {
  return (await axiosClient.get(`${base}`)).data;
}

export async function redeemReward({ rewardId, customerId }) {
  await axiosClient.post(`${base}/${customerId}/${rewardId}`);
}

export async function updateRedeem({ redeemId, data }) {
  await axiosClient.put(`${base}/${redeemId}`, data);
}
