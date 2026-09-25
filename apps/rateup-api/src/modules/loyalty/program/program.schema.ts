import z from "zod";

import { isAvailableChannel, LoyaltyChannel } from "../messaging/channelIds.js";

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
  signupBonusEnabled: z.boolean(),
  referralBonusEnabled: z.boolean(),
  tiersEnabled: z.boolean(),
  tierResetPeriod: z.enum(["never", "yearly", "monthly"]).optional().nullable(),
  /** Trailing months of spend that decide a member's tier; null = lifetime spend. */
  tierQualificationWindowMonths: z.number().int().min(1).max(24).optional().nullable(),
  // Venue & branding profile — written by the onboarding profile step, editable here too.
  businessName: z.string().min(1).max(120).optional().nullable(),
  timezone: z.string().min(1).optional().nullable(),
  logoUrl: z.url().optional().nullable(),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #1C518E")
    .optional()
    .nullable(),
  heroImageUrl: z.url().optional().nullable(),
  contactName: z.string().max(120).optional().nullable(),
  contactPhone: z.string().max(32).optional().nullable(),
  contactEmail: z.email().optional().nullable(),
  /** Print materials (QR card, brochure). Shape is the UI's; the API only stores it. */
  materials: z.record(z.string(), z.unknown()).optional().nullable(),
  pointsActivityAlerts: z.boolean(),
  autoApproveAdjustments: z.boolean(),
  emailNotifications: z.boolean(),
  whatsappNotifications: z.boolean(),
  sendTextInSession: z.boolean(),
  /** Fallback order for member messages. Only channels with an adapter can be switched on. */
  enabledChannels: z
    .array(z.enum(LoyaltyChannel))
    .min(1, "Keep at least one channel on")
    .refine((channels) => channels.every(isAvailableChannel), {
      message: "That channel is not available yet",
    })
    .refine((channels) => new Set(channels).size === channels.length, {
      message: "Each channel can be listed once",
    })
    .optional(),
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
  signupBonusEnabled: loyaltyProgramFields.signupBonusEnabled.default(true),
  referralBonusEnabled: loyaltyProgramFields.referralBonusEnabled.default(true),
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
