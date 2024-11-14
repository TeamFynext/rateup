import { axiosClient } from "@/backend/apiClient";

import { LOYALTY_BASE } from "../base";

const base = LOYALTY_BASE + "/redeem";
const publicBase = "/public" + base;

export async function getLoyaltyRedeems() {
  return (await axiosClient.get(`${base}`)).data;
}

export async function redeemReward({ rewardId, customerId }) {
  await axiosClient.post(`${publicBase}/${customerId}/${rewardId}`);
}
