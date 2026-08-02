import prisma from "../../../utils/prisma.js";
import { getLoyaltyProgramByOrg } from "../program/program.service.js";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Percentage change, or null when there is no baseline to compare against.
 *
 * Growth from an empty month used to be reported as exactly +100%, which is
 * indistinguishable on the card from a genuine doubling — the same shape as
 * issues.txt 19.5. There is no percentage change from zero, so it answers null and
 * the client shows the figure without a delta. See issues.txt 20.42.
 */
function calcChangePercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function monthLabel(value: string | Date): string {
  const date = new Date(value);
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

export const getLoyaltyDashboardStats = async (orgId: string) => {
  const program = await getLoyaltyProgramByOrg(orgId);

  if (!program) {
    return {
      programExists: false,
      programId: null,
      currencySymbol: null,
      summary: {
        totalMembers: 0,
        totalMembersChange: null,
        activeThisMonth: 0,
        activeThisMonthChange: null,
        pointsIssued: 0,
        pointsIssuedChange: null,
        rewardsRedeemed: 0,
        rewardsRedeemedChange: null,
      },
      memberGrowth: [],
      pointsActivity: [],
      tierDistribution: [],
      popularRewards: [],
      recentActivity: [],
    };
  }

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    totalMembers,
    totalMembersLastMonth,
    activeThisMonthRaw,
    activeLastMonthRaw,
    pointsIssuedThisMonth,
    pointsIssuedLastMonth,
    rewardsRedeemedThisMonth,
    rewardsRedeemedLastMonth,
    tierBreakdown,
    popularRewards,
    rawMemberGrowth,
    rawPointsActivity,
    recentTransactions,
  ] = await Promise.all([
    // 1. Total members
    prisma.customerLoyaltyAccount.count({
      where: { programId: program.id },
    }),

    // 2. Total members as of end of last month (for change %)
    prisma.customerLoyaltyAccount.count({
      where: { programId: program.id, createdAt: { lt: thisMonthStart } },
    }),

    // 3. Active this month: distinct accounts with transactions this month
    prisma.loyaltyTransaction.groupBy({
      by: ["accountId"],
      where: { programId: program.id, createdAt: { gte: thisMonthStart } },
    }),

    // 4. Active last month
    prisma.loyaltyTransaction.groupBy({
      by: ["accountId"],
      where: {
        programId: program.id,
        createdAt: { gte: lastMonthStart, lt: thisMonthStart },
      },
    }),

    // 5. Points issued this month
    prisma.loyaltyTransaction.aggregate({
      _sum: { points: true },
      where: {
        programId: program.id,
        transactionType: "earn",
        createdAt: { gte: thisMonthStart },
      },
    }),

    // 6. Points issued last month
    prisma.loyaltyTransaction.aggregate({
      _sum: { points: true },
      where: {
        programId: program.id,
        transactionType: "earn",
        createdAt: { gte: lastMonthStart, lt: thisMonthStart },
      },
    }),

    // 7. Rewards redeemed this month
    prisma.loyaltyRedemption.count({
      where: {
        account: { programId: program.id },
        createdAt: { gte: thisMonthStart },
      },
    }),

    // 8. Rewards redeemed last month
    prisma.loyaltyRedemption.count({
      where: {
        account: { programId: program.id },
        createdAt: { gte: lastMonthStart, lt: thisMonthStart },
      },
    }),

    // 9. Tier distribution
    prisma.customerLoyaltyAccount.groupBy({
      by: ["currentTierId"],
      _count: true,
      where: { programId: program.id },
    }),

    // 10. Top 5 redeemed rewards
    prisma.loyaltyRedemption.groupBy({
      by: ["rewardId"],
      _count: { rewardId: true },
      where: { reward: { programId: program.id } },
      orderBy: { _count: { rewardId: "desc" } },
      take: 5,
    }),

    // 11. Monthly member growth (last 6 months, cumulative total + active per month)
    prisma.$queryRaw`
      WITH months AS (
        SELECT generate_series(
          DATE_TRUNC('month', ${sixMonthsAgo}::timestamptz),
          DATE_TRUNC('month', ${now}::timestamptz),
          '1 month'::interval
        ) AS month
      ),
      active_by_month AS (
        SELECT
          DATE_TRUNC('month', "createdAt") AS tx_month,
          COUNT(DISTINCT "accountId") AS active_count
        FROM "LoyaltyTransaction"
        WHERE "programId" = ${program.id}::uuid
          AND "createdAt" >= ${sixMonthsAgo}::timestamptz
        GROUP BY 1
      )
      SELECT
        m.month,
        (
          SELECT COUNT(*) FROM "CustomerLoyaltyAccount"
          WHERE "programId" = ${program.id}::uuid
            AND "createdAt" < m.month + '1 month'::interval
        ) AS total_members,
        COALESCE(a.active_count, 0) AS active_members
      FROM months m
      LEFT JOIN active_by_month a ON a.tx_month = m.month
      ORDER BY m.month ASC
    `,

    // 12. Monthly points activity (last 6 months)
    prisma.$queryRaw`
      WITH months AS (
        SELECT generate_series(
          DATE_TRUNC('month', ${sixMonthsAgo}::timestamptz),
          DATE_TRUNC('month', ${now}::timestamptz),
          '1 month'::interval
        ) AS month
      )
      SELECT
        m.month,
        -- LOWER() because the approvals path wrote "REDEEM" and "ADJUST" in upper
        -- case until issues.txt 20.27, and those rows are still in the table. An
        -- exact match meant every approved redemption was simply absent from this
        -- chart, so an org routing redemptions through approvals saw a series that
        -- under-reported them with no indication anything was missing.
        -- See issues.txt 20.42.
        COALESCE(SUM(CASE WHEN LOWER(t."transactionType") = 'earn' THEN t.points ELSE 0 END), 0) AS issued,
        COALESCE(SUM(CASE WHEN LOWER(t."transactionType") = 'redeem' THEN ABS(t.points) ELSE 0 END), 0) AS redeemed
      FROM months m
      LEFT JOIN "LoyaltyTransaction" t
        ON t."programId" = ${program.id}::uuid
        AND t."createdAt" >= m.month
        AND t."createdAt" < m.month + '1 month'::interval
      GROUP BY m.month
      ORDER BY m.month ASC
    `,

    // 13. Recent activity (last 5 transactions with contact name)
    prisma.loyaltyTransaction.findMany({
      where: { programId: program.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        account: {
          include: {
            contact: { select: { name: true } },
          },
        },
        reward: { select: { name: true } },
      },
    }),
  ]);

  // Process tier distribution
  const tierDistribution = tierBreakdown.map((t) => {
    const tier = program.tiers.find((pt) => pt.id === t.currentTierId);
    return {
      name: tier?.name || "No Tier",
      value: t._count,
    };
  });

  // Process popular rewards – fetch name + pointsCost
  const rewardIds = popularRewards.map((r) => r.rewardId);
  const rewardsDetails = await prisma.loyaltyReward.findMany({
    where: { id: { in: rewardIds } },
    select: { id: true, name: true, pointsCost: true },
  });

  const popularRewardsWithDetails = popularRewards.map((r) => {
    const details = rewardsDetails.find((d) => d.id === r.rewardId);
    return {
      id: r.rewardId,
      name: details?.name || "Unknown Reward",
      pointsCost: details?.pointsCost || 0,
      redeemed: r._count.rewardId,
    };
  });

  // Rows of the two monthly-rollup queries; counts come back as bigint/string from
  // Postgres, so both are read through Number().
  interface MemberGrowthRow {
    month: string | Date;
    total_members?: number | bigint | string | null;
    active_members?: number | bigint | string | null;
  }
  interface PointsActivityRow {
    month: string | Date;
    issued?: number | bigint | string | null;
    redeemed?: number | bigint | string | null;
  }

  // Process monthly member growth
  // Labels carry the year. A six-month window crossing a year boundary used to
  // produce two identical labels — "Jan" for both Januaries — and a chart with two
  // points labelled the same cannot be read. See issues.txt 20.42.
  const memberGrowth = (rawMemberGrowth as MemberGrowthRow[]).map((row) => ({
    month: monthLabel(row.month),
    members: Number(row.total_members || 0),
    active: Number(row.active_members || 0),
  }));

  // Process monthly points activity
  const pointsActivity = (rawPointsActivity as PointsActivityRow[]).map((row) => ({
    month: monthLabel(row.month),
    issued: Number(row.issued || 0),
    redeemed: Number(row.redeemed || 0),
  }));

  // Process recent activity
  const actionMap: Record<string, string> = {
    earn: "earned",
    redeem: "redeemed",
    adjust: "adjusted",
    expire: "expired",
    refund: "refunded",
  };
  // The lookup folds case. Every writer of `transactionType` uses lower case now
  // (issues.txt 20.27), but rows written before that fix hold "REDEEM" and
  // "ADJUST" from the approvals path — and an unmatched key fell through to the
  // raw column value, so the feed read "Ann REDEEM Free coffee". The chart above
  // has the same history: it filters and matches on the lower-case values, so
  // every approved redemption and every manual adjustment written before the fix
  // is missing from it, with nothing to indicate anything is absent.
  // See issues.txt 20.42.
  const recentActivity = recentTransactions.map((t) => ({
    user: t.account.contact.name || "Unknown",
    action: actionMap[t.transactionType?.toLowerCase()] ?? t.transactionType,
    item: t.reward?.name ?? t.description ?? t.source,
    points: t.points,
    createdAt: t.createdAt,
  }));

  const activeThisMonth = activeThisMonthRaw.length;
  const activeLastMonth = activeLastMonthRaw.length;
  const pointsIssuedCurrent = pointsIssuedThisMonth._sum.points ?? 0;
  const pointsIssuedPrev = pointsIssuedLastMonth._sum.points ?? 0;

  return {
    programExists: true,
    programId: program.id,
    currencySymbol: program.currencySymbol,
    summary: {
      totalMembers,
      totalMembersChange: calcChangePercent(totalMembers, totalMembersLastMonth),
      activeThisMonth,
      activeThisMonthChange: calcChangePercent(activeThisMonth, activeLastMonth),
      pointsIssued: pointsIssuedCurrent,
      pointsIssuedChange: calcChangePercent(pointsIssuedCurrent, pointsIssuedPrev),
      rewardsRedeemed: rewardsRedeemedThisMonth,
      rewardsRedeemedChange: calcChangePercent(rewardsRedeemedThisMonth, rewardsRedeemedLastMonth),
    },
    memberGrowth,
    pointsActivity,
    tierDistribution,
    popularRewards: popularRewardsWithDetails,
    recentActivity,
  };
};
