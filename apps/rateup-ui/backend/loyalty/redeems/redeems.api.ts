import { axiosClient } from "@/backend/apiClient";

import { LOYALTY_BASE } from "../base";

const base = LOYALTY_BASE + "/redemptions";

export async function getLoyaltyRedeems() {
  return (await axiosClient.get(`${base}`)).data;
}

export async function redeemReward(data: {
  customerId: string;
  rewardId: string;
  locationId?: string;
  orderId?: string;
  notes?: string;
}) {
  await axiosClient.post(`${base}/redeem`, data);
}

export async function updateRedeem({ redeemId, data }) {
  await axiosClient.put(`${base}/${redeemId}`, data);
}
