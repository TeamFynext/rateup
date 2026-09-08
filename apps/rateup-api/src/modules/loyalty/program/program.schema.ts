import z from "zod";

const loyaltyProgramFields = {
  name: z.string().min(1, "Program name is required"),
  status: z.enum(["draft", "active", "paused"]),
  currencyName: z.string(),
  currencyCode: z.string(),
  currencySymbol: z.string().optional(),
  defaultCountryCode: z.string(),
  averageOrderValue: z.number().min(0).nullable().optional(),
  signupBonus: z.number(),
  referralBonus: z.number(),
  referralBonusType: z.enum(["points", "gift"]),
  referralRewardId: z.uuid().optional().nullable(),
  refereeBonus: z.number(),
  refereeBonusType: z.enum(["points", "gift"]),
  refereeRewardId: z.uuid().optional().nullable(),
  tiersEnabled: z.boolean(),
  tierResetPeriod: z.enum(["never", "yearly", "monthly"]).optional().nullable(),
  pointsActivityAlerts: z.boolean(),
  autoApproveAdjustments: z.boolean(),
  emailNotifications: z.boolean(),
  whatsappNotifications: z.boolean(),
  sendTextInSession: z.boolean(),
  enableShopifyOrderPoints: z.boolean(),
  enablePointsExpiration: z.boolean(),
  pointsExpirationMonths: z.number(),
  referralMessageTemplate: z.any(),
  whatsappSettingsId: z.string().optional().nullable(),
};

export const loyaltyProgramSchema = z.object({
  ...loyaltyProgramFields,
  status: loyaltyProgramFields.status.default("draft"),
  currencyName: loyaltyProgramFields.currencyName.default("Points"),
  signupBonus: loyaltyProgramFields.signupBonus.default(0),
  referralBonus: loyaltyProgramFields.referralBonus.default(0),
  referralBonusType: loyaltyProgramFields.referralBonusType.default("points"),
  refereeBonus: loyaltyProgramFields.refereeBonus.default(0),
  refereeBonusType: loyaltyProgramFields.refereeBonusType.default("points"),
  tiersEnabled: loyaltyProgramFields.tiersEnabled.default(true),
  pointsActivityAlerts: loyaltyProgramFields.pointsActivityAlerts.default(true),
  autoApproveAdjustments: loyaltyProgramFields.autoApproveAdjustments.default(false),
  emailNotifications: loyaltyProgramFields.emailNotifications.default(true),
  whatsappNotifications: loyaltyProgramFields.whatsappNotifications.default(true),
  sendTextInSession: loyaltyProgramFields.sendTextInSession.default(true),
  enableShopifyOrderPoints: loyaltyProgramFields.enableShopifyOrderPoints.default(false),
  enablePointsExpiration: loyaltyProgramFields.enablePointsExpiration.default(false),
  pointsExpirationMonths: loyaltyProgramFields.pointsExpirationMonths.default(12),
});

export const loyaltyProgramUpdateSchema = z.object(loyaltyProgramFields).partial();

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
