import type { JSONContent } from "@tiptap/react";
import { z } from "zod";

import { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";

function getPlainTextFromTemplate(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;

  const getTextFromNode = (node: unknown): string => {
    if (!node || typeof node !== "object") return "";

    const typedNode = node as {
      type?: string;
      text?: string;
      content?: unknown;
    };

    if (typedNode.type === "text") {
      return typeof typedNode.text === "string" ? typedNode.text : "";
    }

    if (Array.isArray(typedNode.content)) {
      return typedNode.content.map(getTextFromNode).join("");
    }

    return "";
  };

  if (Array.isArray(value)) {
    return value
      .map(getTextFromNode)
      .filter((text) => text.length > 0)
      .join("\n");
  }

  if (typeof value === "object") {
    const typedValue = value as { content?: unknown };

    if (Array.isArray(typedValue.content)) {
      return typedValue.content
        .map(getTextFromNode)
        .filter((text) => text.length > 0)
        .join("\n");
    }
  }

  return "";
}

/** The editor stores its value as a tiptap document; anything object-shaped is one. */
const isTiptapDoc = (value: unknown): value is JSONContent =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const ReferralMessageTemplateSchema = z
  // Stored either as plain text or as the tiptap document the editor emits.
  .union([z.string(), z.array(z.unknown()), z.custom<JSONContent>(isTiptapDoc)])
  .superRefine((value, ctx) => {
    const plainText = getPlainTextFromTemplate(value);

    if (!plainText.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Join message template is required",
      });
      return;
    }

    if ((plainText.match(/\{\{1\}\}/g) || []).length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Message must include exactly one {{1}} for contact name",
      });
    }

    if ((plainText.match(/\{\{2\}\}/g) || []).length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Message must include exactly one {{2}} for referral code",
      });
    }
  });

export const BasicSettingsSchema = z.object({
  programName: z.string().min(1, "Program Name is required"),
  pointsCurrency: z.string().min(1, "Points Currency is required"),
  moneyCurrency: z.string().min(1, "Money Currency is required"),
  defaultCountryCode: z.string().min(1, "Default Country is required"),
  whatsappSettingsId: z.string().optional(),
  referralMessageTemplate: ReferralMessageTemplateSchema,
});

export const NotificationsSettingsSchema = z.object({
  programActive: z.boolean(),
  customerNotifications: z.boolean(),
  autoApproveAdjustments: z.boolean(),
  emailNotifications: z.boolean(),
  whatsappNotifications: z.boolean(),
  enableShopifyOrderPoints: z.boolean(),
});

export const ExpirationSettingsSchema = z.object({
  enabled: z.boolean(),
  months: z.number().min(1, "Expiration Period is required"),
});

const EventTriggerSchema = z.object({
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
  [LoyaltyEventType.POINTS_EXPIRY_ALERT]: EventTriggerSchema,
  [LoyaltyEventType.POINTS_EXPIRED]: EventTriggerSchema,
});
