import prisma from "../../../utils/prisma.js";
import { calculateGiveback, toFiniteNumber } from "../giveback.js";
import { buildGivebackInput } from "../giveback/giveback.service.js";
import { getLoyaltyProgramByOrg } from "../program/program.service.js";
import {
  bucketIndexForDay,
  periodKeyFromDays,
  resolvePeriod,
  type DashboardPeriodKey,
  type ResolvedPeriod,
} from "./dashboard.period.js";
import type { DashboardQuery, LoyaltyDashboardResponse } from "./dashboard.schema.js";

/**
 * The loyalty Overview. Every metric is measured over a selectable window and compared
 * with the window of the same length just before it.
 *
 * Raw SQL is used where Prisma cannot express a FILTER or a JSON cast. Each statement
 * starts with a `loyalty-dashboard:` comment so the tests can dispatch their `$queryRaw`
 * mocks on it and so it is recognisable in `pg_stat_statements`. Counts and sums come
 * back as bigint / Decimal / string; everything is read through `n()` before it reaches
 * the response schema, which would 500 on a bigint.
 */

export interface DashboardOptions extends DashboardQuery {
  /** Injectable clock for tests. */
  now?: Date;
}

type Metric = LoyaltyDashboardResponse["metrics"]["newMembers"];
type Rate = LoyaltyDashboardResponse["metrics"]["redemptionRate"];

/** Percentage change to one decimal place; null when there is nothing to compare against. */
export function calcChangePercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function metric(current: number, previous: number): Metric {
  return { current, previous, changePct: calcChangePercent(current, previous) };
}

/** A 0–100 ratio, null when the denominator is zero. */
function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function rate(current: number | null, previous: number | null): Rate {
  return {
    current,
    previous,
    changePct: current === null || previous === null ? null : calcChangePercent(current, previous),
  };
}

/** Raw SQL hands back bigint for COUNT/SUM(int), Decimal or string for numeric. */
function n(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/* ── raw row shapes ─────────────────────────────────────────────────────────── */

interface WindowRow {
  is_current: boolean;
  issued: unknown;
  redeemed: unknown;
  revenue: unknown;
  active_members: unknown;
}
interface RepeatRow {
  is_current: boolean;
  buyers: unknown;
  repeaters: unknown;
}
interface RedemptionsRow {
  is_current: boolean;
  n: unknown;
}
interface MembersRow {
  total: unknown;
  new_current: unknown;
  new_previous: unknown;
  total_at_period_start: unknown;
}
interface DayRow {
  day: string;
  issued?: unknown;
  redeemed?: unknown;
  joined?: unknown;
}

function byWindow<T extends { is_current: boolean }>(rows: T[]) {
  return {
    current: rows.find((r) => r.is_current === true),
    previous: rows.find((r) => r.is_current === false),
  };
}

const ACTION_LABEL: Record<string, string> = {
  earn: "earned",
  redeem: "redeemed",
  adjust: "adjusted",
  expire: "expired",
  refund: "refunded",
};

/* ── the empty shape ────────────────────────────────────────────────────────── */

function emptyResponse(period: ResolvedPeriod): LoyaltyDashboardResponse {
  const zero = metric(0, 0);
  const none = rate(null, null);
  return {
    programExists: false,
    programId: null,
    currencySymbol: null,
    pointsName: null,
    period: serialisePeriod(period),
    metrics: {
      totalMembers: 0,
      newMembers: zero,
      activeMembers: zero,
      pointsIssued: zero,
      pointsRedeemed: zero,
      rewardsRedeemed: zero,
      revenue: zero,
      redemptionRate: none,
      repeatVisitRate: { ...none, buyers: 0, repeaters: 0 },
      actualGivebackPct: none,
    },
    revenue: { lifetimeTotalSpend: 0 },
    giveback: { modelledPct: null, band: "unknown", pointValue: null },
    liability: {
      outstandingPoints: 0,
      monetaryValue: null,
      enablePointsExpiration: false,
      pointsExpirationMonths: 0,
    },
    rewardsAffordability: {
      cheapestRewardCost: null,
      cheapestRewardName: null,
      membersBelowCheapestReward: null,
    },
    timeline: [],
    tierDistribution: [],
    popularRewards: [],
    recentActivity: [],
  };
}

function serialisePeriod(period: ResolvedPeriod): LoyaltyDashboardResponse["period"] {
  return {
    key: period.key,
    days: period.days,
    granularity: period.granularity,
    tz: period.tz,
    current: {
      start: period.current.start.toISOString(),
      end: period.current.end.toISOString(),
    },
    previous: {
      start: period.previous.start.toISOString(),
      end: period.previous.end.toISOString(),
    },
    label: period.label,
    comparisonLabel: period.comparisonLabel,
  };
}

/* ── the stats ──────────────────────────────────────────────────────────────── */

export const getLoyaltyDashboardStats = async (
  orgId: string,
  opts: DashboardOptions = {},
): Promise<LoyaltyDashboardResponse> => {
  const key: DashboardPeriodKey = opts.period ?? periodKeyFromDays(opts.days) ?? "30d";
  const period = resolvePeriod(key, opts.now ?? new Date(), opts.tz ?? "UTC");

  const program = await getLoyaltyProgramByOrg(orgId);
  if (!program) return emptyResponse(period);

  const programId = program.id;
  const { tz } = period;
  const curStart = period.current.start;
  const curEnd = period.current.end;
  const prevStart = period.previous.start;

  // Cheapest priced reward, from the ACTIVE rewards the program query already loaded.
  // Coupons and gifts sit at pointsCost 0 and are not bought with points.
  const pricedRewards = program.rewards.filter((r) => r.pointsCost > 0);
  const cheapest = pricedRewards.length
    ? pricedRewards.reduce((a, b) => (b.pointsCost < a.pointsCost ? b : a))
    : null;

  const [
    windowRows,
    repeatRows,
    redemptionRows,
    memberRows,
    txDayRows,
    memberDayRows,
    balances,
    tierBreakdown,
    popularRaw,
    recentTransactions,
    belowCheapest,
  ] = await Promise.all([
    prisma.$queryRaw<WindowRow[]>`
      /* loyalty-dashboard: windows */
      WITH w AS (
        SELECT t."accountId", t.points, t.source, t.metadata,
               LOWER(t."transactionType") AS type,
               (t."createdAt" >= ${curStart}::timestamptz) AS is_current
        FROM "LoyaltyTransaction" t
        WHERE t."programId" = ${programId}::uuid
          AND t."createdAt" >= ${prevStart}::timestamptz
          AND t."createdAt" <  ${curEnd}::timestamptz
      )
      SELECT is_current,
        COALESCE(SUM(points)  FILTER (WHERE type = 'earn'), 0)                     AS issued,
        COALESCE(SUM(-points) FILTER (WHERE type = 'redeem' AND points < 0), 0)    AS redeemed,
        COALESCE(SUM(CASE WHEN type = 'earn' AND source = 'purchase'
                           AND jsonb_typeof(metadata->'purchaseAmount') = 'number'
                          THEN (metadata->>'purchaseAmount')::numeric ELSE 0 END), 0) AS revenue,
        COUNT(DISTINCT "accountId")                                                AS active_members
      FROM w GROUP BY is_current
    `,

    prisma.$queryRaw<RepeatRow[]>`
      /* loyalty-dashboard: repeat */
      WITH per_account AS (
        SELECT (t."createdAt" >= ${curStart}::timestamptz) AS is_current, t."accountId", COUNT(*) AS visits
        FROM "LoyaltyTransaction" t
        WHERE t."programId" = ${programId}::uuid
          AND LOWER(t."transactionType") = 'earn' AND t.source = 'purchase'
          AND t."createdAt" >= ${prevStart}::timestamptz AND t."createdAt" < ${curEnd}::timestamptz
        GROUP BY 1, 2
      )
      SELECT is_current, COUNT(*) AS buyers, COUNT(*) FILTER (WHERE visits >= 2) AS repeaters
      FROM per_account GROUP BY is_current
    `,

    prisma.$queryRaw<RedemptionsRow[]>`
      /* loyalty-dashboard: redemptions */
      SELECT (r."createdAt" >= ${curStart}::timestamptz) AS is_current, COUNT(*) AS n
      FROM "loyalty_redemptions" r
      JOIN "CustomerLoyaltyAccount" a ON a.id = r."accountId"
      WHERE a."programId" = ${programId}::uuid
        AND r.status IN ('APPROVED', 'USED')
        AND r."createdAt" >= ${prevStart}::timestamptz AND r."createdAt" < ${curEnd}::timestamptz
      GROUP BY 1
    `,

    prisma.$queryRaw<MembersRow[]>`
      /* loyalty-dashboard: members */
      SELECT COUNT(*) AS total,
        COUNT(*) FILTER (WHERE "createdAt" >= ${curStart}::timestamptz)                                                AS new_current,
        COUNT(*) FILTER (WHERE "createdAt" >= ${prevStart}::timestamptz AND "createdAt" < ${curStart}::timestamptz)    AS new_previous,
        COUNT(*) FILTER (WHERE "createdAt" < ${curStart}::timestamptz)                                                 AS total_at_period_start
      FROM "CustomerLoyaltyAccount" WHERE "programId" = ${programId}::uuid
    `,

    // Per local calendar day; bucketed into weeks or months in JS so the SQL stays
    // portable (no date_bin) and the day boundary follows the caller's zone.
    prisma.$queryRaw<DayRow[]>`
      /* loyalty-dashboard: tx-days */
      SELECT to_char(t."createdAt" AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS day,
        COALESCE(SUM(t.points)  FILTER (WHERE LOWER(t."transactionType") = 'earn'), 0)                  AS issued,
        COALESCE(SUM(-t.points) FILTER (WHERE LOWER(t."transactionType") = 'redeem' AND t.points < 0), 0) AS redeemed
      FROM "LoyaltyTransaction" t
      WHERE t."programId" = ${programId}::uuid
        AND t."createdAt" >= ${curStart}::timestamptz AND t."createdAt" < ${curEnd}::timestamptz
      GROUP BY 1 ORDER BY 1
    `,

    prisma.$queryRaw<DayRow[]>`
      /* loyalty-dashboard: member-days */
      SELECT to_char("createdAt" AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS day, COUNT(*) AS joined
      FROM "CustomerLoyaltyAccount"
      WHERE "programId" = ${programId}::uuid
        AND "createdAt" >= ${curStart}::timestamptz AND "createdAt" < ${curEnd}::timestamptz
      GROUP BY 1 ORDER BY 1
    `,

    prisma.customerLoyaltyAccount.aggregate({
      _sum: { currentPoints: true, totalSpend: true },
      where: { programId },
    }),

    prisma.customerLoyaltyAccount.groupBy({
      by: ["currentTierId"],
      _count: true,
      where: { programId },
    }),

    // Completed redemptions in the window. PENDING / REJECTED / CANCELLED are not
    // "popular", they are noise.
    prisma.loyaltyRedemption.groupBy({
      by: ["rewardId"],
      _count: { rewardId: true },
      where: {
        reward: { programId },
        status: { in: ["APPROVED", "USED"] },
        createdAt: { gte: curStart, lt: curEnd },
      },
      orderBy: { _count: { rewardId: "desc" } },
      take: 5,
    }),

    prisma.loyaltyTransaction.findMany({
      where: { programId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        account: { include: { contact: { select: { name: true } } } },
        reward: { select: { name: true } },
      },
    }),

    cheapest
      ? prisma.customerLoyaltyAccount.count({
          where: { programId, currentPoints: { lt: cheapest.pointsCost } },
        })
      : Promise.resolve(null),
  ]);

  /* ── giveback (no query: the program row already carries rules, rewards, tiers) ── */
  const defaultRule = program.earningRules.find((r) => r.isDefault) ?? null;
  const giveback = calculateGiveback(
    buildGivebackInput(program, defaultRule, program.rewards, program.tiers),
  );
  const pointValue = giveback.pointValue;

  /* ── windows ── */
  const windows = byWindow(windowRows);
  const issued = metric(n(windows.current?.issued), n(windows.previous?.issued));
  const redeemed = metric(n(windows.current?.redeemed), n(windows.previous?.redeemed));
  const revenue = metric(n(windows.current?.revenue), n(windows.previous?.revenue));
  const active = metric(n(windows.current?.active_members), n(windows.previous?.active_members));

  const repeat = byWindow(repeatRows);
  const buyersNow = n(repeat.current?.buyers);
  const repeatersNow = n(repeat.current?.repeaters);
  const repeatVisitRate = {
    ...rate(
      ratio(repeatersNow, buyersNow),
      ratio(n(repeat.previous?.repeaters), n(repeat.previous?.buyers)),
    ),
    buyers: buyersNow,
    repeaters: repeatersNow,
  };

  const redemptions = byWindow(redemptionRows);
  const rewardsRedeemed = metric(n(redemptions.current?.n), n(redemptions.previous?.n));

  const members = memberRows[0];
  const totalMembers = n(members?.total);
  const newMembers = metric(n(members?.new_current), n(members?.new_previous));

  const givebackValue = (points: number, rev: number) =>
    pointValue ? ratio(points * pointValue.best, rev) : null;
  const actualGivebackPct = rate(
    givebackValue(redeemed.current, revenue.current),
    givebackValue(redeemed.previous, revenue.previous),
  );

  /* ── timeline ── */
  const timeline = period.buckets.map((bucket) => ({
    start: bucket.start.toISOString(),
    label: bucket.label,
    issued: 0,
    redeemed: 0,
    members: 0,
    newMembers: 0,
  }));
  for (const row of txDayRows) {
    const i = bucketIndexForDay(period, row.day);
    if (i < 0) continue;
    timeline[i].issued += n(row.issued);
    timeline[i].redeemed += n(row.redeemed);
  }
  for (const row of memberDayRows) {
    const i = bucketIndexForDay(period, row.day);
    if (i < 0) continue;
    timeline[i].newMembers += n(row.joined);
  }
  let running = n(members?.total_at_period_start);
  for (const bucket of timeline) {
    running += bucket.newMembers;
    bucket.members = running;
  }

  /* ── tiers: every configured tier, including empty ones, then the untiered bucket ── */
  const countByTier = new Map(tierBreakdown.map((t) => [t.currentTierId, t._count]));
  const tierDistribution: LoyaltyDashboardResponse["tierDistribution"] = program.tiers.map(
    (tier) => ({
      id: tier.id,
      name: tier.name,
      value: countByTier.get(tier.id) ?? 0,
      threshold: toFiniteNumber(tier.threshold),
      pointsMultiplier: toFiniteNumber(tier.pointsMultiplier, 1),
      color: tier.color,
    }),
  );
  const untiered = countByTier.get(null);
  if (untiered) {
    tierDistribution.push({
      id: null,
      name: "No Tier",
      value: untiered,
      threshold: null,
      pointsMultiplier: null,
      color: null,
    });
  }

  /* ── popular rewards: names from the loaded catalogue, one lookup only for retired rows ── */
  const knownRewards = new Map(program.rewards.map((r) => [r.id, r]));
  const missingIds = popularRaw.map((r) => r.rewardId).filter((id) => !knownRewards.has(id));
  const retired = missingIds.length
    ? await prisma.loyaltyReward.findMany({
        where: { id: { in: missingIds } },
        select: { id: true, name: true, pointsCost: true },
      })
    : [];
  for (const reward of retired) knownRewards.set(reward.id, { ...reward } as never);
  const popularRewards = popularRaw.map((r) => {
    const details = knownRewards.get(r.rewardId);
    return {
      id: r.rewardId,
      name: details?.name ?? "Unknown Reward",
      pointsCost: details?.pointsCost ?? 0,
      redeemed: r._count.rewardId,
    };
  });

  const recentActivity = recentTransactions.map((t) => ({
    user: t.account.contact.name || "Unknown",
    action: ACTION_LABEL[t.transactionType?.toLowerCase()] ?? t.transactionType,
    item: t.reward?.name ?? t.description ?? t.source,
    points: t.points,
    createdAt: t.createdAt.toISOString(),
  }));

  const outstandingPoints = balances._sum.currentPoints ?? 0;

  return {
    programExists: true,
    programId,
    currencySymbol: program.currencySymbol,
    pointsName: program.currencyName,
    period: serialisePeriod(period),
    metrics: {
      totalMembers,
      newMembers,
      activeMembers: active,
      pointsIssued: issued,
      pointsRedeemed: redeemed,
      rewardsRedeemed,
      revenue,
      redemptionRate: rate(
        ratio(redeemed.current, issued.current),
        ratio(redeemed.previous, issued.previous),
      ),
      repeatVisitRate,
      actualGivebackPct,
    },
    revenue: { lifetimeTotalSpend: toFiniteNumber(balances._sum.totalSpend) },
    giveback: { modelledPct: giveback.givebackPct, band: giveback.band, pointValue },
    liability: {
      outstandingPoints,
      monetaryValue: pointValue
        ? Math.round(outstandingPoints * pointValue.best * 100) / 100
        : null,
      enablePointsExpiration: program.enablePointsExpiration,
      pointsExpirationMonths: program.pointsExpirationMonths,
    },
    rewardsAffordability: {
      cheapestRewardCost: cheapest?.pointsCost ?? null,
      cheapestRewardName: cheapest?.name ?? null,
      membersBelowCheapestReward: belowCheapest,
    },
    timeline,
    tierDistribution,
    popularRewards,
    recentActivity,
  };
};
