import { axiosClient } from "../apiClient";

const LOYALTY_EARNING_RULES_URL = "/loyalty/earning-rules";

interface TimeRange {
  start: string; // Format: HH:mm (e.g., "09:00")
  end: string; // Format: HH:mm (e.g., "17:00")
}

/** The `conditions` JSON in the shape the API's earning engine reads. */
interface LoyaltyEarningRuleConditions {
  locations?: { enabled: boolean; location_ids: string[] };
  products?: {
    enabled: boolean;
    categories?: string[];
    product_skus?: string[];
    excluded_categories?: string[];
  };
  payment_methods?: { enabled: boolean; allowed_methods: string[] };
  customer_type?: { enabled: boolean; types: ("new" | "returning" | "first_purchase_only")[] };
  channels?: { enabled: boolean; allowed_channels: ("online" | "in_store" | "mobile_app")[] };
}

export interface LoyaltyEarningRule {
  id?: string;
  name: string;
  description?: string | null;
  priority?: number;
  status?: "active" | "inactive" | "scheduled" | "expired";
  pointsPerUnit?: number;
  multiplier?: number;
  bonusPoints?: number;
  minPurchaseAmount?: number | null;
  maxPurchaseAmount?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  allowedDays?: string[];
  allowedTimeRanges?: TimeRange[];
  applicableToTiers?: string[];
  maxUsesPerCustomer?: number | null;
  maxTotalUses?: number | null;
  conditions?: LoyaltyEarningRuleConditions;
  isDefault?: boolean;
  maxPointsPerTransaction?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoyaltyEarningRuleInput extends Omit<
  LoyaltyEarningRule,
  "id" | "createdAt" | "updatedAt"
> {}

export interface LoyaltyEarningRuleUpdateInput extends Partial<LoyaltyEarningRuleInput> {}

/**
 * Fetches all loyalty earning rules
 */
export const getLoyaltyEarningRules = async (): Promise<LoyaltyEarningRule[]> => {
  const res = await axiosClient.get(LOYALTY_EARNING_RULES_URL);
  return res.data;
};

/**
 * Fetches a loyalty earning rule by ID
 */
export const getLoyaltyEarningRuleById = async (ruleId: string): Promise<LoyaltyEarningRule> => {
  const res = await axiosClient.get(`${LOYALTY_EARNING_RULES_URL}/${ruleId}`);
  return res.data;
};

/**
 * Creates a new loyalty earning rule
 */
export const createLoyaltyEarningRule = async (
  ruleData: LoyaltyEarningRuleInput,
): Promise<LoyaltyEarningRule> => {
  const res = await axiosClient.post(LOYALTY_EARNING_RULES_URL, ruleData);
  return res.data;
};

/**
 * Updates an existing loyalty earning rule
 */
export const updateLoyaltyEarningRule = async (
  ruleId: string,
  ruleData: LoyaltyEarningRuleUpdateInput,
): Promise<LoyaltyEarningRule> => {
  const res = await axiosClient.put(`${LOYALTY_EARNING_RULES_URL}/${ruleId}`, ruleData);
  return res.data;
};

/**
 * Deletes a loyalty earning rule
 */
export const deleteLoyaltyEarningRule = async (ruleId: string): Promise<void> => {
  await axiosClient.delete(`${LOYALTY_EARNING_RULES_URL}/${ruleId}`);
};

export type InstagramMentionKind = "STORY" | "MEDIA" | "COMMENT";

/**
 * The "Instagram mentions" earning option. Stored on the API as one earning rule marked
 * `conditions.trigger = "instagram_mention"`, which the purchase rule list never returns.
 */
export interface InstagramMentionRule {
  /** Null until the option is first saved. */
  id: string | null;
  enabled: boolean;
  pointsPerMention: number;
  mentionKinds: InstagramMentionKind[];
  cooldownDays: number;
}

export type InstagramMentionRuleInput = Omit<InstagramMentionRule, "id">;

export const getInstagramMentionRule = async (): Promise<InstagramMentionRule> => {
  const res = await axiosClient.get(`${LOYALTY_EARNING_RULES_URL}/instagram-mentions`);
  return res.data;
};

export const saveInstagramMentionRule = async (
  input: InstagramMentionRuleInput,
): Promise<InstagramMentionRule> => {
  const res = await axiosClient.put(`${LOYALTY_EARNING_RULES_URL}/instagram-mentions`, input);
  return res.data;
};
