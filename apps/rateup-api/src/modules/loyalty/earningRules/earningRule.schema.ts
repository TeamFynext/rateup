import z from "zod";

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

export const loyaltyEarningRuleConditionsSchema = z.object({
  location_ids: z.array(z.string()).optional(),
  product_categories: z.array(z.string()).optional(),
  product_skus: z.array(z.string()).optional(),
  excluded_product_skus: z.array(z.string()).optional(),
  payment_methods: z.array(z.string()).optional(),
  customer_type: z.enum(["new", "returning", "all"]).optional(),
  channels: z.array(z.string()).optional(),
});

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

export const loyaltyEarningRuleUpdateSchema = loyaltyEarningRuleSchema.partial();

export const ruleIdParamSchema = z.object({
  ruleId: z.string(),
});

export type LoyaltyEarningRuleInput = z.infer<typeof loyaltyEarningRuleSchema>;
export type LoyaltyEarningRuleUpdateInput = z.infer<typeof loyaltyEarningRuleUpdateSchema>;
export type RuleIdParam = z.infer<typeof ruleIdParamSchema>;
