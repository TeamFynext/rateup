import { z } from "zod";

import { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";

export const BasicSettingsSchema = z.object({
  programName: z.string().min(1, "Program Name is required"),
  pointsCurrency: z.string().min(1, "Points Currency is required"),
  moneyCurrency: z.string().min(1, "Money Currency is required"),
  defaultCountryCode: z.string().min(1, "Default Country is required"),
  whatsappSettingsId: z.string().optional(),
});

export const NotificationsSettingsSchema = z.object({
  programActive: z.boolean(),
  customerNotifications: z.boolean(),
  autoApproveAdjustments: z.boolean(),
  emailNotifications: z.boolean(),
  whatsappNotifications: z.boolean(),
});

export const ExpirationSettingsSchema = z.object({
  enabled: z.boolean(),
  months: z.number().min(1, "Expiration Period is required"),
});

export const EventTriggerSchema = z.object({
  enabled: z.boolean(),
  waTemplateId: z.string().optional(),
  triggerDays: z.string().optional(),
  rewardId: z.string().optional(),
});

export const EventTriggersFormSchema = z.object({
  [LoyaltyEventType.POINTS_ISSUED]: EventTriggerSchema,
  [LoyaltyEventType.POINTS_ADJUSTED]: EventTriggerSchema,
  [LoyaltyEventType.REWARD_ISSUED]: EventTriggerSchema,
  [LoyaltyEventType.REWARD_REDEEMED]: EventTriggerSchema,
  [LoyaltyEventType.TIER_UPGRADED]: EventTriggerSchema,
  [LoyaltyEventType.INACTIVITY_REMINDER]: EventTriggerSchema,
  [LoyaltyEventType.BIRTHDAY]: EventTriggerSchema,
});
