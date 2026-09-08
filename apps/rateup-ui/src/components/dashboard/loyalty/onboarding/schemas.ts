import { z } from "zod";

/**
 * Wizard form schemas. These mirror the API's step schemas in
 * `rateup-api/src/modules/loyalty/onboarding/onboarding.schema.ts` — the server revalidates
 * everything, so these exist to give the user the error inline rather than as a toast.
 *
 * Number fields use `z.coerce.number()` because they come off `<Input type="number">` as
 * strings, which is why each schema has a separate input/output type below.
 */

export const basicsFormSchema = z.object({
  name: z.string().min(1, "Give your program a name"),
  currencyName: z.string().min(1, "Name your points"),
  currencyCode: z.string().min(1),
  currencySymbol: z.string().min(1),
  averageOrderValue: z.coerce.number().min(0),
});

/**
 * An optional whole number where the empty input means "not set", stored as null. Plain
 * `z.coerce.number()` would read "" as 0 — for stock that is "sold out", not "unlimited".
 */
const optionalCount = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.coerce.number().int().min(0).nullable(),
);

export const earningFormSchema = z
  .object({
    rules: z
      .array(
        z.object({
          /** Present on a saved rule; the API updates by it so a rename does not fork. */
          id: z.string().optional(),
          name: z.string().min(1, "Name this rule"),
          description: z.string().optional(),
          /** Only the Program editor shows this; the wizard leaves every rule on. */
          status: z.enum(["active", "inactive"]).optional(),
          pointsPerUnit: z.coerce.number().min(0),
          multiplier: z.coerce.number().min(0),
          bonusPoints: z.coerce.number().int().min(0),
          allowedDays: z.array(z.string()),
          // 0 and "" both mean "no minimum", so plain coercion is right here.
          minPurchaseAmount: z.coerce.number().min(0).optional(),
          applicableToTiers: z.array(z.string()).optional(),
          isDefault: z.boolean(),
          priority: z.coerce.number().int(),
        }),
      )
      .min(1, "Keep at least one earning rule"),
  })
  .refine((v) => v.rules.filter((r) => r.isDefault).length === 1, {
    message: "Exactly one rule must be the default",
    path: ["rules"],
  });

export const tiersFormSchema = z
  .object({
    tiersEnabled: z.boolean(),
    tiers: z.array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1, "Name this tier"),
        threshold: z.coerce.number().min(0),
        pointsMultiplier: z.coerce.number().min(0),
        color: z.string(),
        benefitsDescription: z.string().optional(),
      }),
    ),
  })
  // Mirrors LoyaltyTier's @@unique([programId, name]) and @@unique([programId, threshold]).
  // Catching both here is what turns a Prisma constraint violation into a field error.
  .refine((v) => new Set(v.tiers.map((t) => t.name.trim().toLowerCase())).size === v.tiers.length, {
    message: "Two tiers share a name",
    path: ["tiers"],
  })
  .refine((v) => new Set(v.tiers.map((t) => t.threshold)).size === v.tiers.length, {
    message: "Two tiers share a threshold — each needs its own",
    path: ["tiers"],
  })
  .refine((v) => !v.tiersEnabled || v.tiers.length > 0, {
    message: "Add a tier, or turn tiers off",
    path: ["tiers"],
  });

export const rewardsFormSchema = z
  .object({
    /**
     * Points paid for a behaviour rather than for spend. They are `LoyaltyProgram` columns,
     * not reward rows, but they belong beside the rewards they compete with for budget —
     * the giveback estimate counts them all the same.
     */
    signupBonus: z.coerce.number().int().min(0),
    referralBonus: z.coerce.number().int().min(0),
    refereeBonus: z.coerce.number().int().min(0),
    rewards: z.array(
      z.object({
        /** Present on a saved reward, absent on one just added. The API updates by it. */
        id: z.string().optional(),
        name: z.string().min(1, "Name this reward"),
        description: z.string().optional(),
        pointsCost: z.coerce.number().int().min(0),
        rewardType: z.enum(["point", "coupon", "assigned"]),
        rewardValue: z.record(z.string(), z.unknown()),
        /** null = unlimited. Only the Program editor's Advanced disclosure shows it. */
        stockQuantity: optionalCount.optional(),
        /** Tier ids or names that may redeem it; empty = everyone. */
        availableForTiers: z.array(z.string()).optional(),
      }),
    ),
  })
  .refine(
    (v) => new Set(v.rewards.map((r) => r.name.trim().toLowerCase())).size === v.rewards.length,
    { message: "Two rewards share a name", path: ["rewards"] },
  )
  /**
   * `rewardValue` stays an open record rather than a discriminated union, deliberately.
   * `getOnboardingState` hands this form every reward on the programme — including rows the
   * standalone editor wrote in its own dialect, and coupon blobs — and a union would block
   * Continue on rows the merchant never touched. So: validate only the three shapes this
   * wizard itself produces, and leave anything else alone.
   */
  .superRefine((v, ctx) => {
    v.rewards.forEach((reward, index) => {
      const value = reward.rewardValue;
      const path = ["rewards", index, "rewardValue"];

      if (value.type === "free_item") {
        if (typeof value.item_name !== "string" || value.item_name.trim() === "") {
          ctx.addIssue({
            code: "custom",
            path: [...path, "item_name"],
            message: "Name the item",
          });
        }
      } else if (value.type === "discount_percentage") {
        const percentage = value.percentage;
        if (typeof percentage !== "number" || percentage <= 0 || percentage > 100) {
          ctx.addIssue({
            code: "custom",
            path: [...path, "percentage"],
            message: "Enter 1-100",
          });
        }
      } else if (value.type === "discount_fixed") {
        const amount = value.amount;
        if (typeof amount !== "number" || amount <= 0) {
          ctx.addIssue({
            code: "custom",
            path: [...path, "amount"],
            message: "Enter an amount",
          });
        }
      }
    });
  });

export const messagesFormSchema = z.object({
  commands: z.array(
    z.object({
      type: z.string(),
      requestMessage: z.string().min(1, "Give this a keyword"),
      text: z.string().min(1, "Write the reply"),
      waTemplateId: z.string().nullable().optional(),
    }),
  ),
  eventTemplates: z.array(
    z.object({
      eventType: z.string(),
      templateName: z.string(),
      body: z.string().min(1, "Write the message"),
      enabled: z.boolean(),
    }),
  ),
});

export type BasicsFormInput = z.input<typeof basicsFormSchema>;
export type BasicsFormValues = z.output<typeof basicsFormSchema>;
export type EarningFormInput = z.input<typeof earningFormSchema>;
export type EarningFormValues = z.output<typeof earningFormSchema>;
export type TiersFormInput = z.input<typeof tiersFormSchema>;
export type TiersFormValues = z.output<typeof tiersFormSchema>;
export type RewardsFormInput = z.input<typeof rewardsFormSchema>;
/** One row of the rewards field array — shared by the step, the dialog and the converters. */
export type RewardFormRow = RewardsFormInput["rewards"][number];
export type RewardsFormValues = z.output<typeof rewardsFormSchema>;
export type MessagesFormInput = z.input<typeof messagesFormSchema>;
export type MessagesFormValues = z.output<typeof messagesFormSchema>;
