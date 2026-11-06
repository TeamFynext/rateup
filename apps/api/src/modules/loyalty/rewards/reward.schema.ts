import z from "zod";
import { LoyaltyPointRewardSubType, LoyaltyRewardType } from "../../../types/loyalty.js";

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

/**
 * Mirror this reward's redemption codes into the connected store (Shopify or WooCommerce) as
 * discount codes, so the customer can use the code at checkout instead of only at a cashier.
 * Unknown keys are stripped by zod, so anything the dashboard wants to store must be declared
 * here.
 */
const storeDiscountRulesSchema = z.object({
  enabled: z.boolean().optional(),
  valid_for_days: z.number().int().positive().optional().nullable(),
  combines_with: z
    .object({
      order_discounts: z.boolean().optional(),
      product_discounts: z.boolean().optional(),
      shipping_discounts: z.boolean().optional(),
    })
    .optional(),
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
  shopify: storeDiscountRulesSchema.optional(),
  woocommerce: storeDiscountRulesSchema.optional(),
});

/**
 * A review reward is earned by tapping the Google review link, never bought, so a points
 * cost on one would be misleading. Written to tolerate the partial update shape.
 */
function reviewRewardCostsNothing(
  value: { rewardType?: LoyaltyRewardType; pointsCost?: number },
  ctx: z.RefinementCtx,
) {
  if (value.rewardType === LoyaltyRewardType.REVIEW && (value.pointsCost ?? 0) !== 0) {
    ctx.addIssue({
      code: "custom",
      path: ["pointsCost"],
      message: "Review rewards cannot cost points",
    });
  }
}

const loyaltyRewardBaseSchema = z.object({
  name: z.string().min(1, "Reward name is required"),
  /**
   * Stable handle external systems name this reward by. Generated from `name` when it is
   * left out, which is the normal case — the dashboard does not ask for one.
   */
  code: z
    .string()
    .regex(/^[a-z0-9][a-z0-9_-]{1,39}$/, "Use lower-case letters, digits, hyphens or underscores")
    .optional(),
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

export const loyaltyRewardSchema = loyaltyRewardBaseSchema.superRefine(reviewRewardCostsNothing);

export const loyaltyRewardUpdateSchema = loyaltyRewardBaseSchema
  .partial()
  .superRefine(reviewRewardCostsNothing);

export const rewardIdParamSchema = z.object({
  rewardId: z.string(),
});

export type LoyaltyRewardInput = z.infer<typeof loyaltyRewardSchema>;
export type LoyaltyRewardUpdateInput = z.infer<typeof loyaltyRewardUpdateSchema>;
export type RewardIdParam = z.infer<typeof rewardIdParamSchema>;
