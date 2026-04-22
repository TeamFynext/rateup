import z from "zod";
import {
  LoyaltyPointRewardSubType,
  LoyaltyRewardType,
} from "../../../types/loyalty.js";

export enum LoyaltyRewardStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  EXPIRED = "EXPIRED",
  OUT_OF_STOCK = "OUT_OF_STOCK",
}

const discountFixedValueSchema = z.object({
  type: z.literal(LoyaltyPointRewardSubType.DISCOUNT_FIXED),
  amount: z.number().min(0),
});

const discountPercentageValueSchema = z.object({
  type: z.literal(LoyaltyPointRewardSubType.DISCOUNT_PERCENTAGE),
  percentage: z.number().min(0).max(100),
  max_discount_amount: z.number().optional().nullable(),
});

const freeItemValueSchema = z.object({
  type: z.literal(LoyaltyPointRewardSubType.FREE_ITEM),
  item_name: z.string(),
  item_sku: z.string().optional().nullable(),
  item_value: z.number().optional().nullable(),
  quantity: z.number().default(1),
});

const timeRestrictionsSchema = z.object({
  valid_from: z.iso.datetime().optional().nullable(),
  valid_until: z.iso.datetime().optional().nullable(),
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
  rewardType: z.enum(LoyaltyRewardType),
  pointsCost: z.number().min(0),
  rewardValue: z.union([
    z.discriminatedUnion("type", [
      discountFixedValueSchema,
      discountPercentageValueSchema,
      freeItemValueSchema,
    ]),
    z.record(z.string(), z.unknown()),
  ]),
  status: z.enum(LoyaltyRewardStatus).default(LoyaltyRewardStatus.ACTIVE),
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
