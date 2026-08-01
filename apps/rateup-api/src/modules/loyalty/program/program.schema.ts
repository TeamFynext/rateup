import z from "zod";

export const loyaltyProgramSchema = z.object({
  name: z.string().min(1, "Program name is required"),
  status: z.enum(["draft", "active", "paused"]).default("draft"),
  currencyName: z.string().default("Points"),
  currencyCode: z.string(),
  currencySymbol: z.string().optional(),
  defaultCountryCode: z.string(),
  signupBonus: z.number().default(0),
  referralBonus: z.number().default(0),
  referralBonusType: z.enum(["points", "gift"]).default("points"),
  referralRewardId: z.uuid().optional().nullable(),
  refereeBonus: z.number().default(0),
  refereeBonusType: z.enum(["points", "gift"]).default("points"),
  refereeRewardId: z.uuid().optional().nullable(),
  tiersEnabled: z.boolean().default(true),
  tierResetPeriod: z.enum(["never", "yearly", "monthly"]).optional().nullable(),
  pointsActivityAlerts: z.boolean().default(true),
  autoApproveAdjustments: z.boolean().default(false),
  emailNotifications: z.boolean().default(true),
  whatsappNotifications: z.boolean().default(true),
  enableShopifyOrderPoints: z.boolean().default(false),
  enablePointsExpiration: z.boolean().default(false),
  pointsExpirationMonths: z.number().default(12),
  referralMessageTemplate: z.any(),
  whatsappSettingsId: z.string().optional().nullable(),
});

export const loyaltyProgramUpdateSchema = loyaltyProgramSchema.partial();

export const programIdParamSchema = z.object({
  programId: z.string(),
});

export const deleteProgramQuerySchema = z.object({
  force: z.coerce.boolean().optional(),
});

// Response schemas
export const loyaltyProgramResponseSchema = loyaltyProgramSchema.extend({
  id: z.string(),
  orgId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type LoyaltyProgramInput = z.infer<typeof loyaltyProgramSchema>;
export type LoyaltyProgramUpdateInput = z.infer<typeof loyaltyProgramUpdateSchema>;
export type ProgramIdParam = z.infer<typeof programIdParamSchema>;
export type DeleteProgramQuery = z.infer<typeof deleteProgramQuerySchema>;
export type LoyaltyProgramResponse = z.infer<typeof loyaltyProgramResponseSchema>;
