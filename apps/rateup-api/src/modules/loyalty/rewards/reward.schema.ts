import z from "zod";

export enum LoyaltyRewardStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  EXPIRED = "EXPIRED",
  OUT_OF_STOCK = "OUT_OF_STOCK",
}

export enum LoyaltyRewardType {
  DISCOUNT_FIXED = "DISCOUNT_FIXED",
  DISCOUNT_PERCENTAGE = "DISCOUNT_PERCENTAGE",
  FREE_ITEM = "FREE_ITEM",
}

const discountFixedValueSchema = z.object({
  amount: z.number().min(0),
  currency: z.string().default("USD"),
});

const discountPercentageValueSchema = z.object({
  percentage: z.number().min(0).max(100),
  maxAmount: z.number().optional().nullable(),
});

const freeItemValueSchema = z.object({
  itemName: z.string(),
  itemSku: z.string().optional().nullable(),
  quantity: z.number().default(1),
});

const timeRestrictionsSchema = z.object({
  valid_from: z.string().datetime().optional().nullable(),
  valid_until: z.string().datetime().optional().nullable(),
  allowed_days: z.array(z.string()).optional(),
  allowed_time_ranges: z
    .array(
      z.object({
        start: z.string(),
        end: z.string(),
      }),
    )
    .optional(),
  blackout_dates: z.array(z.string()).optional(),
});

const quantityRestrictionsSchema = z.object({
  one_time_use: z.boolean().optional(),
  max_redemptions_per_customer: z.number().optional().nullable(),
  max_redemptions_per_day: z.number().optional().nullable(),
  max_redemptions_per_week: z.number().optional().nullable(),
  max_redemptions_per_month: z.number().optional().nullable(),
});

const spendRequirementsSchema = z.object({
  minimum_spend: z.number().optional().nullable(),
});

const tierRestrictionsSchema = z.object({
  allowed_tiers: z.array(z.string()).optional(),
});

const cooldownRestrictionsSchema = z.object({
  cooldown_hours: z.number().optional().nullable(),
});

const inventoryRestrictionsSchema = z.object({
  stock_quantity: z.number().optional().nullable(),
});

const combinationRulesSchema = z.object({
  cannot_combine_with_other_rewards: z.boolean().optional(),
  cannot_combine_with_promotions: z.boolean().optional(),
  excluded_reward_ids: z.array(z.string()).optional(),
});

const approvalRulesSchema = z.object({
  requires_approval: z.boolean().optional(),
  auto_approve_under_value: z.number().optional().nullable(),
});

const redemptionRulesSchema = z.object({
  time_restrictions: timeRestrictionsSchema.optional(),
  quantity_restrictions: quantityRestrictionsSchema.optional(),
  spend_requirements: spendRequirementsSchema.optional(),
  tier_restrictions: tierRestrictionsSchema.optional(),
  cooldown: cooldownRestrictionsSchema.optional(),
  inventory: inventoryRestrictionsSchema.optional(),
  combination_rules: combinationRulesSchema.optional(),
  approval_rules: approvalRulesSchema.optional(),
});

export const loyaltyRewardSchema = z.object({
  name: z.string().min(1, "Reward name is required"),
  description: z.string().optional().nullable(),
  rewardType: z.enum(["point", "coupon", "assigned"]),
  pointsCost: z.number().min(0),
  rewardValue: z.union([
    z.object({ points: z.number() }),
    z.object({
      code: z.string().optional(),
      description: z.string().optional(),
    }),
    z.object({
      description: z.string().optional(),
      sku: z.string().optional(),
    }),
  ]),
  status: z.enum(["active", "inactive", "out_of_stock"]).default("active"),
  redemptionRules: redemptionRulesSchema.optional(),
  stockQuantity: z.number().optional().nullable(),
  availableForTiers: z.array(z.string()).optional(),
  stockRedeemed: z.number().default(0),
  waTemplateId: z.string().optional().nullable(),
});

export const loyaltyRewardUpdateSchema = loyaltyRewardSchema.partial();

export const rewardIdParamSchema = z.object({
  rewardId: z.string(),
});

export type LoyaltyRewardInput = z.infer<typeof loyaltyRewardSchema>;
export type LoyaltyRewardUpdateInput = z.infer<
  typeof loyaltyRewardUpdateSchema
>;
export type RewardIdParam = z.infer<typeof rewardIdParamSchema>;
