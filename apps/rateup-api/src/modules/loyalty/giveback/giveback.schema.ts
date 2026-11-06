import z from "zod";

import type { GivebackResult } from "../giveback.js";

/**
 * Zod mirror of `GivebackResult` (`../giveback.ts`). The `satisfies` clause below makes a
 * drift between the two a compile error rather than a runtime 500 from the serializer.
 */
const valuedRewardSchema = z.object({
  name: z.string(),
  pointsCost: z.number(),
  worth: z.number(),
  valuePerPoint: z.number(),
  dependsOnAov: z.boolean(),
});

export const givebackResultSchema = z.object({
  status: z.enum(["ok", "needs_average_order_value", "no_earning", "no_valued_rewards"]),
  band: z.enum(["unknown", "low", "healthy", "generous", "excessive"]),
  pointsPerCurrencyUnit: z.number(),
  pointsPerOrder: z.number().nullable(),
  pointValue: z.object({ best: z.number(), worst: z.number() }).nullable(),
  bestReward: valuedRewardSchema.nullable(),
  valuedRewards: z.array(valuedRewardSchema),
  skippedRewards: z.array(
    z.object({
      name: z.string(),
      reason: z.enum(["no_points_cost", "no_monetary_value", "unrecognised_shape"]),
    }),
  ),
  givebackPct: z.number().nullable(),
  givebackPctFloor: z.number().nullable(),
  flatBonusPct: z.number().nullable(),
  givebackPctTop: z.number().nullable(),
  topTier: z
    .object({ name: z.string(), pointsMultiplier: z.number(), givebackPct: z.number() })
    .nullable(),
  perTier: z.array(
    z.object({
      name: z.string(),
      threshold: z.number(),
      pointsMultiplier: z.number(),
      givebackPct: z.number(),
      color: z.string().optional(),
    }),
  ),
  oneTimeCosts: z
    .object({ perNewMember: z.number().nullable(), perReferralPair: z.number().nullable() })
    .nullable(),
}) satisfies z.ZodType<GivebackResult>;

export const givebackResponseSchema = z.object({
  programExists: z.boolean(),
  programId: z.string().nullable(),
  result: givebackResultSchema.nullable(),
  inputs: z
    .object({
      pointsName: z.string(),
      currencySymbol: z.string(),
      currencyCode: z.string(),
      averageOrderValue: z.number().nullable(),
      defaultRule: z
        .object({
          id: z.string(),
          name: z.string().nullable(),
          pointsPerUnit: z.number(),
          multiplier: z.number(),
          bonusPoints: z.number(),
        })
        .nullable(),
      tiersEnabled: z.boolean(),
      rewardsConsidered: z.number().int(),
    })
    .nullable(),
});
