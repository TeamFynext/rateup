import z from "zod";

import type {
  InstagramMentionRuleKind,
  LoyaltyEarningRuleConditions,
} from "../../../types/loyalty.js";

const INSTAGRAM_MENTION_RULE_KINDS = [
  "STORY",
  "MEDIA",
  "COMMENT",
] as const satisfies readonly InstagramMentionRuleKind[];

export enum LoyaltyEarningRuleStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SCHEDULED = "SCHEDULED",
  EXPIRED = "EXPIRED",
}

export enum DayOfWeek {
  MONDAY = "MONDAY",
  TUESDAY = "TUESDAY",
  WEDNESDAY = "WEDNESDAY",
  THURSDAY = "THURSDAY",
  FRIDAY = "FRIDAY",
  SATURDAY = "SATURDAY",
  SUNDAY = "SUNDAY",
}

export const timeRangeSchema = z.object({
  start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
});

/**
 * The `conditions` JSON, in the shape `EarningRulesEngine` reads (`LoyaltyEarningRuleConditions`).
 * It used to describe a flat shape (`location_ids`, `payment_methods: string[]`, …) the engine
 * never read, so a rule written through it could not restrict anything.
 */
export const loyaltyEarningRuleConditionsSchema = z.object({
  trigger: z.enum(["instagram_mention"]).optional(),
  mentionKinds: z.array(z.enum(INSTAGRAM_MENTION_RULE_KINDS)).optional(),
  cooldownDays: z.number().int().min(0).max(365).optional(),
  locations: z.object({ enabled: z.boolean(), location_ids: z.array(z.string()) }).optional(),
  products: z
    .object({
      enabled: z.boolean(),
      categories: z.array(z.string()).optional(),
      product_skus: z.array(z.string()).optional(),
      excluded_categories: z.array(z.string()).optional(),
    })
    .optional(),
  payment_methods: z
    .object({ enabled: z.boolean(), allowed_methods: z.array(z.string()) })
    .optional(),
  customer_type: z
    .object({
      enabled: z.boolean(),
      types: z.array(z.enum(["new", "returning", "first_purchase_only"])),
    })
    .optional(),
  channels: z
    .object({
      enabled: z.boolean(),
      allowed_channels: z.array(z.enum(["online", "in_store", "mobile_app"])),
    })
    .optional(),
}) satisfies z.ZodType<LoyaltyEarningRuleConditions>;

export const loyaltyEarningRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  description: z.string().optional().nullable(),
  priority: z.number().default(0),
  status: z.enum(["active", "inactive", "scheduled", "expired"]).default("active"),
  pointsPerUnit: z.number().min(0).default(1.0),
  multiplier: z.number().default(1.0),
  bonusPoints: z.number().default(0),
  minPurchaseAmount: z.number().optional().nullable(),
  maxPurchaseAmount: z.number().optional().nullable(),
  validFrom: z.iso.datetime().optional().nullable(),
  validUntil: z.iso.datetime().optional().nullable(),
  allowedDays: z.array(z.string()).optional(),
  allowedTimeRanges: z.array(timeRangeSchema).optional(),
  applicableToTiers: z.array(z.string()).optional(),
  maxUsesPerCustomer: z.number().optional().nullable(),
  maxTotalUses: z.number().optional().nullable(),
  conditions: loyaltyEarningRuleConditionsSchema.optional(),
  isDefault: z.boolean().default(false),
  maxPointsPerTransaction: z.number().optional().nullable(),
});

/**
 * The "Instagram mentions" earning option. Stored as one `LoyaltyEarningRule` whose
 * `conditions.trigger` is `instagram_mention`; `pointsPerMention` is its `bonusPoints`.
 */
export const instagramMentionRuleSchema = z.object({
  enabled: z.boolean(),
  pointsPerMention: z.number().int().min(1).max(100000),
  mentionKinds: z.array(z.enum(INSTAGRAM_MENTION_RULE_KINDS)).min(1),
  cooldownDays: z.number().int().min(0).max(365),
});

export type InstagramMentionRuleInput = z.infer<typeof instagramMentionRuleSchema>;

export const loyaltyEarningRuleUpdateSchema = loyaltyEarningRuleSchema.partial();

export const ruleIdParamSchema = z.object({
  ruleId: z.string(),
});

export type LoyaltyEarningRuleInput = z.infer<typeof loyaltyEarningRuleSchema>;
export type LoyaltyEarningRuleUpdateInput = z.infer<typeof loyaltyEarningRuleUpdateSchema>;
export type RuleIdParam = z.infer<typeof ruleIdParamSchema>;
