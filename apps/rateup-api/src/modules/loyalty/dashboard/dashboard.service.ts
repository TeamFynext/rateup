import prisma from "../../../utils/prisma.js";
import { getLoyaltyProgramByOrg } from "../program/program.service.js";

export const getLoyaltyDashboardStats = async (orgId: string) => {
  const program = await getLoyaltyProgramByOrg(orgId);

  if (!program) {
    return {
      programExists: false,
      programId: null,
      currencySymbol: null,
      summary: {
        totalCustomers: 0,
        pointsIssued: 0,
        pointsRedeemed: 0,
      },
      analytics: {
        pointsEarnedVsRedeemed: [],
        customerGrowthOverTime: [],
      },
      tierBreakdown: [],
      popularRewards: [],
    };
  }

  const [
    totalCustomers,
    pointsIssued,
    pointsRedeemed,
    tierBreakdown,
    popularRewards,
    rawAnalytics,
    rawCustomerGrowth,
  ] = await Promise.all([
    // 1. Total Customers
    prisma.customerLoyaltyAccount.count({
      where: { programId: program.id },
    }),

    // 2. Points Issued
    prisma.loyaltyTransaction.aggregate({
      _sum: { points: true },
      where: { programId: program.id, transactionType: "earn" },
    }),

    // 3. Points Redeemed
    prisma.loyaltyTransaction.aggregate({
      _sum: { points: true },
      where: { programId: program.id, transactionType: "redeem" },
    }),

    // 4. Breakdown of customers by tier level
    prisma.customerLoyaltyAccount.groupBy({
      by: ["currentTierId"],
      _count: true,
      where: { programId: program.id },
    }),

    // 5. Most popular redeemed rewards
    prisma.loyaltyRedemption.groupBy({
      by: ["rewardId"],
      _count: { rewardId: true },
      where: { reward: { programId: program.id } },
      orderBy: { _count: { rewardId: "desc" } },
      take: 5,
    }),

    // 6. Analytics: points earned vs redeemed (Time Series)
    prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', "createdAt") as date,
        SUM(CASE WHEN "transactionType" = 'earn' THEN "points" ELSE 0 END) as earned,
        SUM(CASE WHEN "transactionType" = 'redeem' THEN ABS("points") ELSE 0 END) as redeemed
      FROM "LoyaltyTransaction"
      WHERE "programId" = ${program.id}::uuid
      GROUP BY 1
      ORDER BY 1 ASC
    `,

    // 7. Total customers over time (Daily Growth)
    prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', "createdAt") as date,
        COUNT(*) as count
      FROM "CustomerLoyaltyAccount"
      WHERE "programId" = ${program.id}::uuid
      GROUP BY 1
      ORDER BY 1 ASC
    `,
  ]);

  // Process Tier Breakdown
  const tierStats = tierBreakdown.map((t) => {
    const tier = program.tiers.find((pt) => pt.id === t.currentTierId);
    return {
      tierId: t.currentTierId,
      name: tier?.name || "No Tier",
      count: t._count,
    };
  });

  // Process Popular Rewards - Fetch details
  const rewardIds = popularRewards.map((r) => r.rewardId);
  const rewardsDetails = await prisma.loyaltyReward.findMany({
    where: { id: { in: rewardIds } },
  });

  const popularRewardsWithDetails = popularRewards.map((r) => {
    const details = rewardsDetails.find((d) => d.id === r.rewardId);
    return {
      id: r.rewardId,
      name: details?.name || "Unknown Reward",
      pointsCost: details?.pointsCost || 0,
      count: r._count.rewardId,
    };
  });

  // Process Customer Growth to be Cumulative
  let cumulativeCustomers = 0;
  const customerGrowth = (rawCustomerGrowth as any[]).map((entry: any) => {
    cumulativeCustomers += Number(entry.count);
    return {
      date: entry.date,
      newCustomers: Number(entry.count),
      totalCustomers: cumulativeCustomers,
    };
  });

  // Process Analytics to be friendly
  const analytics = (rawAnalytics as any[]).map((entry: any) => ({
    date: entry.date,
    earned: Number(entry.earned || 0),
    redeemed: Number(entry.redeemed || 0),
  }));

  return {
    programExists: true,
    programId: program.id,
    currencySymbol: program.currencySymbol,
    summary: {
      totalCustomers,
      pointsIssued: pointsIssued._sum.points || 0,
      pointsRedeemed: Math.abs(pointsRedeemed._sum.points || 0),
    },
    analytics: {
      pointsEarnedVsRedeemed: analytics,
      customerGrowthOverTime: customerGrowth,
    },
    tierBreakdown: tierStats,
    popularRewards: popularRewardsWithDetails,
  };
};
