import { axiosClient } from "@/backend/apiClient";

const BASE_PATH = "/loyalty/dashboard/";

/**
 * Mirrors `dashboardResponseSchema` in
 * `rateup-api/src/modules/loyalty/dashboard/dashboard.schema.ts`.
 */

export const DASHBOARD_PERIODS = ["30d", "90d", "12m"] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

/** A value in the current window against the previous window of the same length. */
export interface PeriodMetric {
  current: number;
  previous: number;
  /** Percentage change, one decimal; null when the previous window was empty. */
  changePct: number | null;
}

/** A 0–100 ratio that is null when its denominator was zero. */
export interface PeriodRate {
  current: number | null;
  previous: number | null;
  changePct: number | null;
}

export type GivebackBandName = "unknown" | "low" | "healthy" | "generous" | "excessive";

export interface LoyaltyDashboardStats {
  programExists: boolean;
  programId: string | null;
  currencySymbol: string | null;
  pointsName: string | null;
  period: {
    key: DashboardPeriod;
    days: number;
    granularity: "week" | "month";
    tz: string;
    current: { start: string; end: string };
    previous: { start: string; end: string };
    /** "Last 30 days" */
    label: string;
    /** "vs 6 Jul – 4 Aug" */
    comparisonLabel: string;
  };
  metrics: {
    totalMembers: number;
    newMembers: PeriodMetric;
    activeMembers: PeriodMetric;
    pointsIssued: PeriodMetric;
    pointsRedeemed: PeriodMetric;
    rewardsRedeemed: PeriodMetric;
    /** Sum of purchase amounts on purchase-earn transactions. */
    revenue: PeriodMetric;
    /** pointsRedeemed / pointsIssued, per window. */
    redemptionRate: PeriodRate;
    /** Of accounts with ≥1 purchase in the window, the share with ≥2. */
    repeatVisitRate: PeriodRate & { buyers: number; repeaters: number };
    /** Value of points redeemed (at the best reward) over loyalty revenue. */
    actualGivebackPct: PeriodRate;
  };
  revenue: { lifetimeTotalSpend: number };
  giveback: {
    modelledPct: number | null;
    band: GivebackBandName;
    pointValue: { best: number; worst: number } | null;
  };
  liability: {
    outstandingPoints: number;
    monetaryValue: number | null;
    enablePointsExpiration: boolean;
    pointsExpirationMonths: number;
  };
  rewardsAffordability: {
    cheapestRewardCost: number | null;
    cheapestRewardName: string | null;
    membersBelowCheapestReward: number | null;
  };
  timeline: Array<{
    start: string;
    label: string;
    issued: number;
    redeemed: number;
    /** Cumulative members at the end of the bucket. */
    members: number;
    newMembers: number;
  }>;
  tierDistribution: Array<{
    id: string | null;
    name: string;
    value: number;
    threshold: number | null;
    pointsMultiplier: number | null;
    color: string | null;
  }>;
  popularRewards: Array<{ id: string; name: string; pointsCost: number; redeemed: number }>;
  recentActivity: Array<{
    user: string;
    action: string;
    item: string;
    points: number;
    createdAt: string;
  }>;
}

export interface DashboardParams {
  period: DashboardPeriod;
  /** IANA zone the browser cuts days in. */
  tz?: string;
}

export const getLoyaltyDashboardData = async (
  params: DashboardParams,
): Promise<LoyaltyDashboardStats> => {
  return (await axiosClient.get(BASE_PATH, { params }))?.data;
};
