//for demo

import { axiosClient } from "../apiClient";
import { PUBLIC_LOYALTY_BASE } from "./base";

export async function createLCAction({ customerId, actionId, amount }) {
  await axiosClient.post(
    `${PUBLIC_LOYALTY_BASE}/customer/${customerId}/${actionId}`,
    { amount },
  );
}

export async function createLCRedeem({ customerId, rewardId }) {
  await axiosClient.post(
    `${PUBLIC_LOYALTY_BASE}/redeem/${customerId}/${rewardId}`,
  );
}
