import z from "zod";

import { DASHBOARD_PERIODS } from "./dashboard.period.js";

export const dashboardQuerySchema = z.object({
  period: z.enum(DASHBOARD_PERIODS).optional(),
  /** Older clients sent `?days=`; mapped onto the nearest period. */
  days: z.coerce.number().int().positive().optional(),
  /** IANA zone the browser cuts days in. Unknown zones fall back to UTC, never a 500. */
  tz: z.string().max(64).optional(),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

/** A value in the current window against the previous window of the same length. */
const metricSchema = z.object({
  current: z.number(),
  previous: z.number(),
  /** Percentage change, one decimal; null when the previous window was empty. */
  changePct: z.number().nullable(),
});

/** A ratio (0–100) that is null when its denominator is zero. */
const rateSchema = z.object({
  current: z.number().nullable(),
  previous: z.number().nullable(),
  changePct: z.number().nullable(),
});

const isoDate = z.iso.datetime();

export const dashboardResponseSchema = z.object({
  programExists: z.boolean(),
  programId: z.string().nullable(),
  currencySymbol: z.string().nullable(),
  pointsName: z.string().nullable(),
  period: z.object({
    key: z.enum(DASHBOARD_PERIODS),
    days: z.number().int(),
    granularity: z.enum(["week", "month"]),
    tz: z.string(),
    current: z.object({ start: isoDate, end: isoDate }),
    previous: z.object({ start: isoDate, end: isoDate }),
    label: z.string(),
    comparisonLabel: z.string(),
  }),
  metrics: z.object({
    totalMembers: z.number().int(),
    newMembers: metricSchema,
    activeMembers: metricSchema,
    pointsIssued: metricSchema,
    pointsRedeemed: metricSchema,
    rewardsRedeemed: metricSchema,
    /** Sum of purchase amounts on purchase-earn transactions. */
    revenue: metricSchema,
    /** pointsRedeemed / pointsIssued, per window. */
    redemptionRate: rateSchema,
    /** Of accounts with ≥1 purchase in the window, the share with ≥2. */
    repeatVisitRate: rateSchema.extend({
      buyers: z.number().int(),
      repeaters: z.number().int(),
    }),
    /** Value of points redeemed (at the best reward) over loyalty revenue, per window. */
    actualGivebackPct: rateSchema,
  }),
  revenue: z.object({
    /** SUM(CustomerLoyaltyAccount.totalSpend) — every purchase ever recorded. */
    lifetimeTotalSpend: z.number(),
  }),
  giveback: z.object({
    /** The modelled figure from `calculateGiveback`, for the strip/headline. */
    modelledPct: z.number().nullable(),
    band: z.enum(["unknown", "low", "healthy", "generous", "excessive"]),
    /** Currency value of one point at the best / worst reward. */
    pointValue: z.object({ best: z.number(), worst: z.number() }).nullable(),
  }),
  liability: z.object({
    outstandingPoints: z.number().int(),
    /** outstandingPoints × pointValue.best; null when no reward prices a point. */
    monetaryValue: z.number().nullable(),
    enablePointsExpiration: z.boolean(),
    pointsExpirationMonths: z.number().int(),
  }),
  rewardsAffordability: z.object({
    cheapestRewardCost: z.number().int().nullable(),
    cheapestRewardName: z.string().nullable(),
    /** Members whose balance cannot buy the cheapest reward; null when no reward is priced. */
    membersBelowCheapestReward: z.number().int().nullable(),
  }),
  timeline: z.array(
    z.object({
      start: isoDate,
      label: z.string(),
      issued: z.number().int(),
      redeemed: z.number().int(),
      /** Cumulative members at the end of the bucket. */
      members: z.number().int(),
      newMembers: z.number().int(),
    }),
  ),
  tierDistribution: z.array(
    z.object({
      id: z.string().nullable(),
      name: z.string(),
      value: z.number().int(),
      threshold: z.number().nullable(),
      pointsMultiplier: z.number().nullable(),
      color: z.string().nullable(),
    }),
  ),
  popularRewards: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      pointsCost: z.number().int(),
      redeemed: z.number().int(),
    }),
  ),
  recentActivity: z.array(
    z.object({
      user: z.string(),
      action: z.string(),
      item: z.string(),
      points: z.number().int(),
      createdAt: isoDate,
    }),
  ),
});
export type LoyaltyDashboardResponse = z.infer<typeof dashboardResponseSchema>;
