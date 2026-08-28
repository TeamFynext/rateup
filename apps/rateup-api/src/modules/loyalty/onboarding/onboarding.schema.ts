import z from "zod";

import { LoyaltyEventType, LoyaltyTemplateTypes } from "../../../types/enums.js";
import { LoyaltyRewardType } from "../../../types/loyalty.js";
import { LOYALTY_PRESET_KEYS } from "./presets.js";

/**
 * Wizard step ids, in order. `onboardingStep` on `LoyaltyProgram` stores the last one
 * completed, which is what lets the wizard resume.
 */
export const ONBOARDING_STEPS = ["basics", "earning", "tiers", "rewards", "messages"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const presetKeySchema = z.enum(LOYALTY_PRESET_KEYS);

export const stepParamSchema = z.object({
  step: z.enum(ONBOARDING_STEPS),
});

/* ── basics ─────────────────────────────────────────────────────────────────── */

export const basicsStepSchema = z.object({
  presetKey: presetKeySchema,
  name: z.string().min(1, "Programme name is required"),
  currencyName: z.string().min(1).default("Points"),
  currencyCode: z.string().min(1).default("INR"),
  currencySymbol: z.string().min(1).default("₹"),
  defaultCountryCode: z.string().optional(),
  whatsappSettingsId: z.string().optional(),
  signupBonus: z.number().int().min(0).default(0),
  referralBonus: z.number().int().min(0).default(0),
  refereeBonus: z.number().int().min(0).default(0),
});

/* ── earning ────────────────────────────────────────────────────────────────── */

const earningRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  description: z.string().optional().nullable(),
  pointsPerUnit: z.number().min(0).default(1),
  multiplier: z.number().min(0).default(1),
  bonusPoints: z.number().int().min(0).default(0),
  allowedDays: z.array(z.string()).default([]),
  minPurchaseAmount: z.number().min(0).optional().nullable(),
  isDefault: z.boolean().default(false),
  priority: z.number().int().default(0),
});

export const earningStepSchema = z
  .object({ rules: z.array(earningRuleSchema).min(1, "At least one earning rule is required") })
  // `activate` refuses a programme with no default rule, so catching it here gives the
  // user the error on the step that caused it rather than four steps later.
  .refine((v) => v.rules.filter((r) => r.isDefault).length === 1, {
    message: "Exactly one rule must be marked as the default earning rule",
    path: ["rules"],
  })
  .refine((v) => new Set(v.rules.map((r) => r.name.trim().toLowerCase())).size === v.rules.length, {
    message: "Rule names must be unique",
    path: ["rules"],
  });

/* ── tiers ──────────────────────────────────────────────────────────────────── */

const tierSchema = z.object({
  name: z.string().min(1, "Tier name is required"),
  threshold: z.number().min(0),
  pointsMultiplier: z.number().min(0).default(1),
  color: z.string().default("#999999"),
  benefitsDescription: z.string().optional().nullable(),
});

export const tiersStepSchema = z
  .object({
    tiersEnabled: z.boolean().default(true),
    tiers: z.array(tierSchema).default([]),
  })
  // `LoyaltyTier` carries @@unique([programId, name]) AND @@unique([programId, threshold]).
  // Both are checked here so a collision surfaces as a field error rather than a 500 from
  // Prisma partway through the transaction.
  .refine((v) => new Set(v.tiers.map((t) => t.name.trim().toLowerCase())).size === v.tiers.length, {
    message: "Tier names must be unique",
    path: ["tiers"],
  })
  .refine((v) => new Set(v.tiers.map((t) => t.threshold)).size === v.tiers.length, {
    message: "Each tier must have a different threshold",
    path: ["tiers"],
  })
  .refine((v) => !v.tiersEnabled || v.tiers.length > 0, {
    message: "Add at least one tier, or turn tiers off",
    path: ["tiers"],
  });

/* ── rewards ────────────────────────────────────────────────────────────────── */

const rewardSchema = z.object({
  name: z.string().min(1, "Reward name is required"),
  description: z.string().optional().nullable(),
  pointsCost: z.number().int().min(0),
  rewardType: z.enum(LoyaltyRewardType).default(LoyaltyRewardType.POINT),
  rewardValue: z.record(z.string(), z.unknown()),
  stockQuantity: z.number().int().min(0).optional().nullable(),
});

export const rewardsStepSchema = z
  .object({ rewards: z.array(rewardSchema).default([]) })
  .refine(
    (v) => new Set(v.rewards.map((r) => r.name.trim().toLowerCase())).size === v.rewards.length,
    { message: "Reward names must be unique", path: ["rewards"] },
  );

/* ── messages ───────────────────────────────────────────────────────────────── */

const commandSchema = z.object({
  type: z.enum(LoyaltyTemplateTypes),
  /** The keyword the customer texts. Matched case-insensitively on the way in. */
  requestMessage: z.string().min(1, "Keyword is required"),
  text: z.string().min(1, "Reply text is required"),
});

const eventTemplateSchema = z.object({
  eventType: z.enum(LoyaltyEventType),
  // Meta only accepts lowercase letters, digits and underscores in a template name.
  templateName: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_]+$/, "Template names may only use lowercase letters, digits and underscores"),
  body: z.string().min(1),
});

export const messagesStepSchema = z.object({
  commands: z.array(commandSchema).default([]),
  eventTemplates: z.array(eventTemplateSchema).default([]),
  /** Rich-text document sent when someone joins. Same shape as `referralMessageTemplate`. */
  referralMessageTemplate: z.unknown().optional(),
});

/* ── responses ──────────────────────────────────────────────────────────────── */

export const skippedCommandSchema = z.object({
  requestMessage: z.string(),
  reason: z.enum(["keyword_taken_by_automation", "keyword_taken_by_command"]),
});

export const eventTemplateResultSchema = z.object({
  eventType: z.enum(LoyaltyEventType),
  templateName: z.string(),
  status: z.enum(["pending", "failed"]),
  error: z.string().optional(),
});

export type BasicsStepInput = z.infer<typeof basicsStepSchema>;
export type EarningStepInput = z.infer<typeof earningStepSchema>;
export type TiersStepInput = z.infer<typeof tiersStepSchema>;
export type RewardsStepInput = z.infer<typeof rewardsStepSchema>;
export type MessagesStepInput = z.infer<typeof messagesStepSchema>;
export type SkippedCommand = z.infer<typeof skippedCommandSchema>;
export type EventTemplateResult = z.infer<typeof eventTemplateResultSchema>;
export type StepParam = z.infer<typeof stepParamSchema>;
