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
  /**
   * The join and referral bonuses moved to the rewards step — they are rewards paid for a
   * behaviour, not programme identity. Optional here so a basics payload that no longer
   * mentions them leaves the stored values alone rather than resetting them to 0.
   */
  signupBonus: z.number().int().min(0).optional(),
  referralBonus: z.number().int().min(0).optional(),
  refereeBonus: z.number().int().min(0).optional(),
  /** Typical spend in one visit. Nullable — null means the merchant skipped it. */
  averageOrderValue: z.number().min(0).nullable().optional(),
});

/* ── earning ────────────────────────────────────────────────────────────────── */

const earningRuleSchema = z.object({
  /** Present when editing a stored rule; matched on before the name, so a rename sticks. */
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Rule name is required"),
  description: z.string().optional().nullable(),
  pointsPerUnit: z.number().min(0).default(1),
  multiplier: z.number().min(0).default(1),
  bonusPoints: z.number().int().min(0).default(0),
  allowedDays: z.array(z.string()).default([]),
  minPurchaseAmount: z.number().min(0).optional().nullable(),
  /** Absent = leave the stored restriction alone; the Program editor may not show it. */
  applicableToTiers: z.array(z.string()).optional(),
  /** Absent = active. The Program editor sends "inactive" for a rule switched off. */
  status: z.enum(["active", "inactive"]).optional(),
  isDefault: z.boolean().default(false),
  priority: z.number().int().default(0),
});

export const earningStepSchema = z
  .object({
    rules: z.array(earningRuleSchema).min(1, "At least one earning rule is required"),
    /**
     * The wizard only ever adds; the Program editor sends the whole desired list, so a
     * rule missing from it was removed on purpose. Off by default to keep older clients'
     * partial payloads harmless.
     */
    deleteMissing: z.boolean().optional(),
  })
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
  id: z.string().uuid().optional(),
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
    /** See `earningStepSchema.deleteMissing`. */
    deleteMissing: z.boolean().optional(),
    /** A removed tier that still has members needs this, or the step refuses with 409. */
    downgradeCustomers: z.boolean().optional(),
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
  /**
   * Present when the wizard is editing a reward that already exists. Keying the update on
   * it — rather than on the name — is what lets a merchant rename a reward instead of
   * silently forking a second live one.
   */
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Reward name is required"),
  description: z.string().optional().nullable(),
  pointsCost: z.number().int().min(0),
  rewardType: z.enum(LoyaltyRewardType).default(LoyaltyRewardType.POINT),
  rewardValue: z.record(z.string(), z.unknown()),
  /** Absent = leave stored stock alone; null = unlimited. */
  stockQuantity: z.number().int().min(0).optional().nullable(),
  /** Absent = leave the stored tier restriction alone. */
  availableForTiers: z.array(z.string()).optional(),
});

export const rewardsStepSchema = z
  .object({
    rewards: z.array(rewardSchema).default([]),
    /**
     * Points paid for joining and for a referral. They live on `LoyaltyProgram`, not on a
     * reward row, but they are edited here — absent means "leave what is stored alone", so
     * an older client's rewards-only payload is still harmless.
     */
    signupBonus: z.number().int().min(0).optional(),
    referralBonus: z.number().int().min(0).optional(),
    refereeBonus: z.number().int().min(0).optional(),
  })
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
  /** Meta's verdict on the template the trigger now points at. */
  status: z.enum(["pending", "approved", "rejected", "failed"]),
  templateId: z.string().optional(),
  /** True when a template of that name already existed and was pointed at, not resubmitted. */
  reused: z.boolean().optional(),
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
