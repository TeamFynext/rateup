import type { TFunction } from "i18next";
import { z } from "zod";

import { FEEDBACK_DRAFT_KEYS } from "@/backend/loyalty/feedback.api.ts";

/**
 * Forms on the Feedback page. Numeric fields are `z.coerce.number()` so the form values
 * (`z.input`) and the parsed values (`z.output`) differ — same convention as the rewards
 * forms.
 */

export const feedbackSetupSchema = z.object({
  draftKey: z.enum(FEEDBACK_DRAFT_KEYS),
  teamId: z.string().min(1, "Pick the team whose Google review link customers are sent to"),
  whatsappSettingsPhoneId: z.string().optional(),
});
export type FeedbackSetupFormValues = z.infer<typeof feedbackSetupSchema>;

export const feedbackSettingsSchema = z.object({
  sendDelayMinutes: z.coerce
    .number()
    .int()
    .min(0)
    .max(7 * 24 * 60),
  cooldownDays: z.coerce.number().int().min(0, "Cannot be negative").max(365, "At most a year"),
  teamId: z.string().min(1, "Pick a team"),
  rewardId: z.string().nullable(),
  happyMinRating: z.coerce.number().int().min(1).max(5),
});
export type FeedbackSettingsFormValues = z.input<typeof feedbackSettingsSchema>;
export type FeedbackSettingsValues = z.output<typeof feedbackSettingsSchema>;

export const reviewRewardSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional(),
  waTemplateId: z.string().optional(),
});
export type ReviewRewardFormValues = z.infer<typeof reviewRewardSchema>;

/** Minutes after points are earned; the stored value is appended when it is not a preset. */
export const SEND_DELAY_PRESETS = [0, 30, 60, 180, 1440] as const;

export interface SelectOption {
  value: string;
  label: string;
}

export function sendDelayOptions(t: TFunction, current?: number): SelectOption[] {
  const label = (minutes: number): string => {
    if (minutes === 0) return t("Straight away");
    if (minutes < 60) return t("{minutes} minutes", { minutes });
    if (minutes < 1440) {
      const hours = minutes / 60;
      return Number.isInteger(hours)
        ? hours === 1
          ? t("1 hour")
          : t("{hours} hours", { hours })
        : t("{minutes} minutes", { minutes });
    }
    const days = minutes / 1440;
    return Number.isInteger(days)
      ? days === 1
        ? t("Next day")
        : t("{days} days", { days })
      : t("{minutes} minutes", { minutes });
  };
  const values: number[] = [...SEND_DELAY_PRESETS];
  if (current !== undefined && !values.includes(current)) {
    values.push(current);
    values.sort((a, b) => a - b);
  }
  return values.map((minutes) => ({ value: String(minutes), label: label(minutes) }));
}

export function happyThresholdOptions(t: TFunction): SelectOption[] {
  return [5, 4, 3, 2].map((rating) => ({
    value: String(rating),
    label: rating === 5 ? t("5 stars only") : t("{rating} stars or more", { rating }),
  }));
}
