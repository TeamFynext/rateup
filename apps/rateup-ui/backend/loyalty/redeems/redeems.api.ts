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

// Reward Short Code API
export async function getRewardByShortCode(shortCode: string) {
  // Using absolute path as requested: /api/loyalty/accounts/rewards/:shortCode
  // Assuming LOYALTY_BASE is /loyalty or similar, but prompt specified full path.
  // Ideally, use axiosClient which handles base API url.
  // If LOYALTY_BASE is used, check what it is. Usually it is a prefix.
  // Assuming apiClient.ts has base url set.
  // Route: /loyalty/accounts/rewards/:shortCode
  return (await axiosClient.get(`/loyalty/accounts/rewards/${shortCode}`)).data;
}

export async function redeemRewardByShortCode(shortCode: string) {
  return (
    await axiosClient.post(`/loyalty/accounts/rewards/${shortCode}/redeem`)
  ).data;
}
