import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod";

/**
 * Wizard form schemas. These mirror the API's step schemas in
 * `rateup-api/src/modules/loyalty/onboarding/onboarding.schema.ts` — the server revalidates
 * everything, so these exist to give the user the error inline rather than as a toast.
 *
 * Number fields use `z.coerce.number()` because they come off `<Input type="number">` as
 * strings, which is why each schema has a separate input/output type below.
 */

/** A six-digit hex colour — what the API's `brandColor` column accepts. */
export const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

/**
 * An uploaded image: the stored absolute URL, or nothing.
 *
 * The API stores both image columns as `z.url()`, so a value that is not one is refused —
 * and because the profile step is a single payload, that 400 takes the business details
 * down with the logo. `z.string()` here let such a value through to the server, where the
 * only sign of it was a generic "Could not save this step". Checking it in the form puts
 * the message on the tile that produced it. `""`/absent both mean "no image".
 */
const uploadedImageUrl = z
  .union([z.literal(""), z.url("That image did not finish uploading — add it again")])
  .optional();

export const profileFormSchema = z.object({
  businessName: z.string().min(1, "Give your business a name"),
  name: z.string().min(1, "Name your loyalty program"),
  currencyCode: z.string().min(1),
  currencySymbol: z.string().min(1),
  timezone: z.string().min(1, "Pick a timezone"),
  contactName: z.string().optional(),
  contactPhone: z
    .string()
    .refine((v) => !v || isValidPhoneNumber(v), "Enter a valid phone number")
    .optional(),
  contactEmail: z.email("Enter a valid email").or(z.literal("")).optional(),
  logoUrl: uploadedImageUrl,
  brandColor: z.string().regex(HEX_COLOUR, "Use a hex colour like #1C518E"),
  heroImageUrl: uploadedImageUrl,
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
    /** What the programme calls its points — asked here, beside the rate that mints them. */
    currencyName: z.string().trim().min(1, "Name your points"),
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
    /**
     * Typical spend in one visit — edited here, beside the rate, because this is where the
     * preview first needs it. Empty means "not set" and is stored as null.
     */
    averageOrderValue: z.preprocess(
      (value) => (value === "" || value === undefined ? null : value),
      z.coerce.number().min(0).nullable(),
    ),
  })
  .refine((v) => v.rules.filter((r) => r.isDefault).length === 1, {
    message: "Exactly one rule must be the default",
    path: ["rules"],
  });

/** One tier as the VIP step edits it: a name and a colour; the rest is fixed. */
const tierRowSchema = z.object({
  /** Present on a saved tier; the API updates by it so a rename does not fork. */
  id: z.string().optional(),
  name: z.string().min(1, "Name this tier"),
  color: z.string().regex(HEX_COLOUR, "Pick a colour"),
});

/** The windows a merchant can pick from. Strings because they come off a `Select`. */
/** The slider's range. 0 means lifetime spend — no window at all. */
export const VIP_WINDOW_MAX_MONTHS = 12;

/** The base plus at most this many above it. Longer ladders belong to the full tier editor. */
export const UPPER_TIERS_MAX = 2;

/** A tier above the base: reached by spend, with its own perks and, optionally, a faster rate. */
export const upperTierRowSchema = tierRowSchema.extend({
  threshold: z.coerce.number().min(1, "Set the spend that unlocks it"),
  /** How much faster this tier earns. 1 = the same rate as everyone. */
  pointsMultiplier: z.coerce
    .number()
    .min(1, "A tier cannot earn slower than everyone else")
    .max(10, "Keep the multiplier at 10× or under"),
  benefitsDescription: z.string().max(500, "Keep the perks under 500 characters").optional(),
});

export const vipTierFormSchema = z
  .object({
    tiersEnabled: z.boolean(),
    qualificationWindowMonths: z.number().int().min(0).max(VIP_WINDOW_MAX_MONTHS),
    /** Everyone starts here; only the name and colour are the merchant's. */
    base: tierRowSchema,
    /** The rungs above the base, lowest first. */
    upper: z
      .array(upperTierRowSchema)
      .min(1, "Add a tier above the base, or turn tiers off")
      .max(UPPER_TIERS_MAX, "Up to three tiers in all"),
  })
  // Mirrors LoyaltyTier's @@unique([programId, name]).
  .superRefine((v, ctx) => {
    const names = [v.base.name, ...v.upper.map((tier) => tier.name)].map((name) =>
      name.trim().toLowerCase(),
    );
    v.upper.forEach((tier, index) => {
      if (names.indexOf(names[index + 1]) !== index + 1) {
        ctx.addIssue({
          code: "custom",
          message: "Give each tier its own name",
          path: ["upper", index, "name"],
        });
      }
      // Mirrors @@unique([programId, threshold]) — and a ladder has to climb.
      if (index > 0 && tier.threshold <= v.upper[index - 1].threshold) {
        ctx.addIssue({
          code: "custom",
          message: "Each tier must take more spend than the one below it",
          path: ["upper", index, "threshold"],
        });
      }
    });
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

/**
 * A Meta template body. Meta refuses a submission whose body starts or ends with a
 * variable, and one whose variables are not numbered in order of appearance — both come
 * back as a rejected template minutes later, so they are caught here.
 *
 * Only event bodies go through this. A keyword reply's text is stored as reply content and
 * never submitted; the template a never-messaged customer gets is a separate record.
 */
const templateBody = z
  .string()
  .min(1, "Write the message")
  .refine(
    (body) => !/^\{\{\d+\}\}/.test(body.trim()) && !/\{\{\d+\}\}$/.test(body.trim()),
    "Meta will not accept a message that starts or ends with a variable. Put a word before or after it.",
  )
  .refine((body) => {
    const slots = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((match) => Number(match[1]));
    return slots.every((slot, index) => slot === index + 1);
  }, "Variables have to be used in order, starting from the first one.");

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
      body: templateBody,
      enabled: z.boolean(),
    }),
  ),
});

export type ProfileFormInput = z.input<typeof profileFormSchema>;
export type ProfileFormValues = z.output<typeof profileFormSchema>;
export type EarningFormInput = z.input<typeof earningFormSchema>;
export type EarningFormValues = z.output<typeof earningFormSchema>;
export type VipTierFormInput = z.input<typeof vipTierFormSchema>;
export type VipTierFormValues = z.output<typeof vipTierFormSchema>;
export type RewardsFormInput = z.input<typeof rewardsFormSchema>;
/** One row of the rewards field array — shared by the step, the dialog and the converters. */
export type RewardFormRow = RewardsFormInput["rewards"][number];
export type RewardsFormValues = z.output<typeof rewardsFormSchema>;
export type MessagesFormInput = z.input<typeof messagesFormSchema>;
export type MessagesFormValues = z.output<typeof messagesFormSchema>;
