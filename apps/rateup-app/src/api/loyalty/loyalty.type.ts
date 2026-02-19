export type LoyaltyRewardStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "OUT_OF_STOCK"
  | "EXPIRED";

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
  availableRewards: Array<CustomerReward>;
  issuableRewards: Array<CustomerReward>;
  redeemedRewards: CustomerRedemption[];
}

interface CustomerReward {
  id: string;
  programId: string;
  name: string;
  description: string;
  status: LoyaltyRewardStatus;
  pointsCost: number;
  rewardType: "assigned" | "coupon" | "point";
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
}

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

export interface LoyaltyTier {
  id: string;
  programId: string;
  name: string;
  threshold: number;
  pointsMultiplier: number;
  color: string;
  benefitsDescription?: string | null;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignRewardRequest {
  rewardId: string;
  notes?: string;
  customerId: string;
}

export interface AssignRewardResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    customerId: string;
    rewardId: string;
    assignedAt: string;
    notes?: string;
  };
}
