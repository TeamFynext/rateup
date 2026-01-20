import { axiosClient } from "@/backend/apiClient";

import { LOYALTY_BASE } from "../base";

const base = `${LOYALTY_BASE}/accounts`;

export interface CustomerRedemption {
  id: string;
  customerId: string;
  rewardId: string;
  pointsUsed: number;
  status: "pending" | "approved" | "rejected" | "used";
  createdAt: string;
  updatedAt: string;
  reward: {
    id: string;
    name: string;
    description?: string | null;
    rewardType: "discount_fixed" | "discount_percentage" | "free_item";
    pointsCost: number;
    rewardValue: any;
  };
}

export interface CustomerRewardsResponse {
  customer: {
    id: string;
    contactId: string;
    currentPoints: number;
    lifetimePoints: number;
    referralCode: string;
    currentTier: {
      name: string;
      id: string;
    };
    name: string;
    phone: string;
    email: string;
    points: number;
    status: string;
  };
  availableRewards: Array<{
    id: string;
    programId: string;
    name: string;
    description: string;
    status: "active" | "inactive" | "out_of_stock";
    pointsCost: number;
    rewardType: "discount_fixed" | "discount_percentage" | "free_item";
    rewardValue: {
      maxAmount: number | null;
      percentage?: number;
      amount?: number;
      itemId?: string;
    };
    stockQuantity: number | null;
    stockRedeemed: number;
    redemptionRules: Record<string, any>;
    availableForTiers: string[];
    createdAt: string;
    updatedAt: string;
  }>;
  redeemedRewards: CustomerRedemption[];
  //   redemptions: {
  //     unused: CustomerRedemption[];
  //     used: CustomerRedemption[];
  //   };
}

export interface ClaimRewardInput {
  phone: string;
  rewardId: string;
}

export interface UseRedemptionInput {
  redemptionId: string;
}

/**
 * Get customer by phone number with their available rewards and redemptions
 */
export async function getCustomerRewardsByPhone(
  phone: string,
): Promise<CustomerRewardsResponse> {
  const response = await axiosClient.get(`${base}/phone/${phone}`);
  return response.data;
}

/**
 * Claim a reward for a customer (creates a redemption)
 */
export async function claimReward(
  data: ClaimRewardInput,
): Promise<CustomerRedemption> {
  const response = await axiosClient.post(`${base}/claim`, data);
  return response.data;
}

/**
 * Mark a redemption as used
 */
export async function useRedemption(
  data: UseRedemptionInput,
): Promise<CustomerRedemption> {
  const response = await axiosClient.post(`${base}/use`, data);
  return response.data;
}
