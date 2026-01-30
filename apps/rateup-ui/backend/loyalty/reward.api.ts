import { axiosClient } from "../apiClient";

// Value schemas
export interface DiscountFixedValue {
  amount: number;
  currency?: string;
}

export interface DiscountPercentageValue {
  percentage: number;
  maxAmount?: number | null;
}

export interface FreeItemValue {
  itemName: string;
  itemSku?: string | null;
  quantity?: number;
}

export interface PointValue {
  points: number;
}

export interface CouponValue {
  code?: string | null;
  description?: string | null;
}

export interface AssignedValue {
  description: string;
  sku?: string | null;
}

export type RewardValue =
  | DiscountFixedValue
  | DiscountPercentageValue
  | FreeItemValue
  | PointValue
  | CouponValue
  | AssignedValue;

// Redemption rules schemas
export interface TimeRestrictions {
  valid_from?: string | null;
  valid_until?: string | null;
  allowed_days?: string[];
  allowed_time_ranges?: Array<{ start: string; end: string }>;
  blackout_dates?: string[];
}

export interface QuantityRestrictions {
  one_time_use?: boolean;
  max_redemptions_per_customer?: number | null;
  max_redemptions_per_day?: number | null;
  max_redemptions_per_week?: number | null;
  max_redemptions_per_month?: number | null;
}

export interface SpendRequirements {
  minimum_spend?: number | null;
}

export interface TierRestrictions {
  allowed_tiers?: string[];
}

export interface CooldownRestrictions {
  cooldown_hours?: number | null;
}

export interface InventoryRestrictions {
  stock_quantity?: number | null;
}

export interface CombinationRules {
  cannot_combine_with_other_rewards?: boolean;
  cannot_combine_with_promotions?: boolean;
  excluded_reward_ids?: string[];
}

export interface ApprovalRules {
  requires_approval?: boolean;
  auto_approve_under_value?: number | null;
}

export interface RedemptionRules {
  time_restrictions?: TimeRestrictions;
  quantity_restrictions?: QuantityRestrictions;
  spend_requirements?: SpendRequirements;
  tier_restrictions?: TierRestrictions;
  cooldown?: CooldownRestrictions;
  inventory?: InventoryRestrictions;
  combination_rules?: CombinationRules;
  approval_rules?: ApprovalRules;
}

// Main reward interface
export interface LoyaltyReward {
  id: string;
  programId: string;
  name: string;
  description?: string | null;
  rewardType:
    | "discount_fixed"
    | "discount_percentage"
    | "free_item"
    | "point"
    | "coupon"
    | "assigned";
  pointsCost: number;
  rewardValue: RewardValue;
  status: "active" | "inactive" | "out_of_stock";
  redemptionRules?: RedemptionRules;
  stockQuantity?: number | null;
  availableForTiers?: string[];
  stockRedeemed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyaltyRewardInput {
  name: string;
  description?: string | null;
  rewardType: "point" | "coupon" | "assigned";
  pointsCost: number;
  rewardValue: RewardValue;
  status?: "active" | "inactive" | "out_of_stock";
  redemptionRules?: RedemptionRules;
  stockQuantity?: number | null;
  availableForTiers?: string[];
  stockRedeemed?: number;
}

const LOYALTY_REWARDS_BASE = "/loyalty/rewards";

export interface LoyaltyRewardUpdateInput extends Partial<LoyaltyRewardInput> {}

/**
 * Get all loyalty rewards
 */
export const getLoyaltyRewards = async (): Promise<LoyaltyReward[]> => {
  const response = await axiosClient.get(LOYALTY_REWARDS_BASE);
  return response.data;
};

/**
 * Get a single loyalty reward by ID
 */
export const getLoyaltyRewardById = async (
  rewardId: string,
): Promise<LoyaltyReward> => {
  const response = await axiosClient.get(`${LOYALTY_REWARDS_BASE}/${rewardId}`);
  return response.data;
};

/**
 * Create a new loyalty reward
 */
export const createLoyaltyReward = async (
  rewardData: LoyaltyRewardInput,
): Promise<LoyaltyReward> => {
  const response = await axiosClient.post(LOYALTY_REWARDS_BASE, rewardData);
  return response.data;
};

/**
 * Update an existing loyalty reward
 */
export const updateLoyaltyReward = async (
  rewardId: string,
  rewardData: LoyaltyRewardUpdateInput,
): Promise<LoyaltyReward> => {
  const response = await axiosClient.put(
    `${LOYALTY_REWARDS_BASE}/${rewardId}`,
    rewardData,
  );
  return response.data;
};

/**
 * Delete a loyalty reward
 */
export const deleteLoyaltyReward = async (rewardId: string): Promise<void> => {
  await axiosClient.delete(`${LOYALTY_REWARDS_BASE}/${rewardId}`);
};
