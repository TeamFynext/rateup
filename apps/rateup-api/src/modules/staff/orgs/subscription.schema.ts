import { z } from "zod";
import { UNLIMITED_COUNT } from "../../subscription/subscription.data.js";

/** Every staff change says why. It is stored on the audit row, not shown to the customer. */
export const reasonSchema = z.string().trim().min(5).max(500);

const active = z.object({ active: z.boolean() });
const count = z.number().int().min(0).max(UNLIMITED_COUNT);
const countOf = z.object({ max: count });

/**
 * The features blob, typed. Mirrors `SubscriptionFeatures` (types/global.d.ts) so an
 * override can only ever write a shape the rest of the API reads — the customer-side
 * editor this replaces took `z.any()`.
 */
export const subscriptionFeaturesSchema = z.object({
  team: z.object({
    active: z.boolean(),
    count: countOf,
    teamMember: z.object({ active: z.boolean(), count: countOf }),
  }),
  webSurvey: z.object({
    active: z.boolean(),
    encryption: active,
    googleReview: active,
    emailNotification: active,
    htmlCodePage: active,
    webhook: active,
    count: z.object({ monthlyResponseLimit: count }),
  }),
  whatsapp: z.object({
    active: z.boolean(),
    conversation: z.object({ active: z.boolean(), count: countOf }),
    campaign: active.optional(),
    loyalty: active.optional(),
    referrals: active.optional(),
    catalog: active.optional(),
  }),
  ai: z.object({
    active: z.boolean(),
    count: z.object({ completionTokens: count, promptTokens: count }),
  }),
});
export type SubscriptionFeaturesInput = z.infer<typeof subscriptionFeaturesSchema>;

const futureDate = z.coerce
  .date()
  .refine((date) => date.getTime() > Date.now(), "Must be in the future.");

export const planChangeSchema = z.object({
  rateupPlanId: z.uuid(),
  expiresAt: futureDate,
  /** Keep an Enterprise deal's negotiated ceilings rather than the tier's unlimited ones. */
  preserveContractedCaps: z.boolean().default(true),
  reason: reasonSchema,
});
export type PlanChangeInput = z.infer<typeof planChangeSchema>;

export const expiryChangeSchema = z.object({ expiresAt: futureDate, reason: reasonSchema });
export type ExpiryChangeInput = z.infer<typeof expiryChangeSchema>;

export const featureOverrideSchema = z.object({
  features: subscriptionFeaturesSchema,
  reason: reasonSchema,
});
export type FeatureOverrideInput = z.infer<typeof featureOverrideSchema>;

export const addonGrantSchema = z.object({
  quantity: z.number().int().min(1).max(20),
  /** Defaults to the month a bought pack lasts. */
  expiresAt: futureDate.optional(),
  reason: reasonSchema,
});
export type AddonGrantInput = z.infer<typeof addonGrantSchema>;

export const reasonOnlySchema = z.object({ reason: reasonSchema });
export type ReasonOnlyInput = z.infer<typeof reasonOnlySchema>;

export const addonParamSchema = z.object({ id: z.uuid(), addonId: z.uuid() });
export type AddonParam = z.infer<typeof addonParamSchema>;
