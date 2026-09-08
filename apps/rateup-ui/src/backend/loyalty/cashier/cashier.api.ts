import { axiosClient } from "@/backend/apiClient";

import { LOYALTY_BASE } from "../base.ts";
import type { LoyaltyRewardStatus, LoyaltyRewardValue } from "../reward.api";

const base = `${LOYALTY_BASE}/accounts`;

/** `RedemptionStatus` is a Prisma enum — uppercase on the wire. */
export type RedemptionStatus =
  | "PENDING"
  | "APPROVED"
  | "USED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export interface CustomerRedemption {
  id: string;
  accountId: string;
  rewardId: string;
  redemptionCode: string;
  status: RedemptionStatus;
  usedAt: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  reward: {
    id: string;
    name: string;
    description?: string | null;
    rewardType: "point" | "coupon" | "assigned";
    pointsCost: number;
    rewardValue: LoyaltyRewardValue;
  };
}

export interface CustomerReward {
  id: string;
  programId: string;
  name: string;
  description: string | null;
  status: LoyaltyRewardStatus;
  pointsCost: number;
  rewardType: "assigned" | "coupon" | "point";
  rewardValue: LoyaltyRewardValue & {
    maxAmount?: number | null;
    percentage?: number;
    amount?: number;
    itemId?: string;
  };
  stockQuantity: number | null;
  stockRedeemed: number;
  redemptionRules: Record<string, unknown>;
  availableForTiers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CashierRewardSummary {
  id: string;
  name: string;
  pointsCost: number;
  rewardType: string;
}

/**
 * Something the counter still has to hand over. Two kinds because two tables hold them:
 * an approved redemption is used with its code (`POST /redemptions/apply`); an issued gift
 * with its short code (`POST /accounts/rewards/:shortCode/redeem`).
 */
export type PendingRedemption =
  | {
      kind: "redemption";
      id: string;
      code: string;
      status: "APPROVED";
      createdAt: string;
      expiresAt: string | null;
      reward: CashierRewardSummary | null;
    }
  | {
      kind: "assigned";
      id: string;
      code: string;
      status: "ISSUED";
      createdAt: string;
      expiresAt: null;
      reward: CashierRewardSummary | null;
    };

export interface CashierRecentTransaction {
  id: string;
  transactionType: string;
  source: string;
  points: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
  purchaseAmount: number | null;
}

export interface CashierTierSummary {
  id: string;
  name: string;
  threshold: number;
  pointsMultiplier: number;
  color: string | null;
}

/** Mirrors `getCustomerAccountByPhoneHandler` in rateup-api. */
export interface CustomerRewardsResponse {
  customer: {
    id: string;
    contactId: string;
    currentPoints: number;
    lifetimePoints: number;
    totalSpend: number;
    referralCode: string;
    currentTier: {
      id: string;
      name: string;
      threshold?: string | number;
      pointsMultiplier?: string | number;
      color?: string;
    } | null;
    name: string;
    phone: string;
    email: string | null;
    points: number;
    status: string;
    createdAt: string;
  };
  availableRewards: CustomerReward[];
  issuableRewards: CustomerReward[];
  activeCoupons: Array<Record<string, unknown>>;
  redeemedRewards: CustomerRedemption[];
  pendingRedemptions: PendingRedemption[];
  awaitingApproval: Array<{
    id: string;
    code: string;
    createdAt: string;
    reward: CashierRewardSummary | null;
  }>;
  recentTransactions: CashierRecentTransaction[];
  tier: {
    current: CashierTierSummary | null;
    next: { id: string; name: string; threshold: number } | null;
    amountToNext: number | null;
  };
  program: { currencySymbol: string; pointsName: string; signupBonus: number };
}

/** One row of `GET /accounts?search=` — the account with its contact. */
export interface CustomerSearchResult {
  id: string;
  contactId: string;
  currentPoints: number;
  lifetimePoints: number;
  referralCode?: string;
  status?: string;
  currentTier: { id: string; name: string; color?: string } | null;
  contact: { id: string; name: string | null; phone: string; email?: string | null };
}

/**
 * Get customer by phone number with their available rewards and redemptions
 */
export async function getCustomerRewardsByPhone(phone: string): Promise<CustomerRewardsResponse> {
  const response = await axiosClient.get(`${base}/phone/${phone}`);
  return response.data;
}

/**
 * Search customers by partial name or phone
 */
export async function searchCustomers(params: {
  search?: string;
  name?: string;
}): Promise<CustomerSearchResult[]> {
  const response = await axiosClient.get(base, { params });
  return response.data;
}
