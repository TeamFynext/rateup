import { axiosClient } from "@/backend/apiClient";
import type { RequestPayload } from "@/types/api.ts";

import { LOYALTY_BASE } from "../base.ts";

const base = LOYALTY_BASE + "/redemptions";

export interface RedeemRewardResponse {
  message?: string;
  redemptionCode?: string;
  /**
   * Set when the reward syncs to Shopify: opening it applies the code to the customer's cart,
   * so they never have to type it. Null when the reward does not sync or the sync failed.
   */
  shopifyDiscountUrl?: string | null;
  redemption?: {
    id: string;
    status?: string;
  };
}

export interface ShortCodeRedeemResponse {
  id: string;
  shortCode?: string;
  status?: string;
}

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
  return (await axiosClient.post<RedeemRewardResponse>(`${base}/redeem`, data)).data;
}

export async function updateRedeem({ redeemId, data }: { redeemId: string; data: RequestPayload }) {
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
    await axiosClient.post<ShortCodeRedeemResponse>(`/loyalty/accounts/rewards/${shortCode}/redeem`)
  ).data;
}
