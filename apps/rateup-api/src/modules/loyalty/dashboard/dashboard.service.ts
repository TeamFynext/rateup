import prisma from "../../../utils/prisma.js";

interface SummaryData {
  title: string;
  id: number;
  value: number;
}

interface OverallActionsData {
  name: string;
  totalActions: number;
}

interface ActionName {
  title: string;
  type: string;
}

interface TopActionsData {
  name: ActionName;
  participants: number;
  points: number;
}

interface TopPerformersData {
  name: string;
  total_actions: number;
  recent_actions: number;
}

interface TopRedeemedRewardsData {
  name: string;
  times_redeemed: number;
  required_points: number;
}

interface LoyaltyDashboardStats {
  summaryData: SummaryData[];
  overallActionsData: OverallActionsData[];
  topActionsData: TopActionsData[];
  topPerformersData: TopPerformersData[];
  topRedeemedRewardsData: TopRedeemedRewardsData[];
}

export const getLoyaltyDashboardStats = async (
  orgId: string,
): Promise<LoyaltyDashboardStats> => {
  const results = await prisma.$queryRaw<
    {
      data1: number;
      data2: number;
      data3: number;
      data4: number;
      data5: number;
    }[]
  >`SELECT 
    (SELECT COUNT(*) FROM "LoyaltyCustomer" WHERE "orgId" = ${orgId}::uuid) AS data1,
    (SELECT SUM("totalEarnedPoints") FROM "LoyaltyCustomer" lc WHERE lc."orgId" = ${orgId}::uuid) AS data2,
    (SELECT COUNT(*) FROM "LoyaltyRedeem" WHERE "status" != 'FAILED' AND "customerId" IN (SELECT id FROM "LoyaltyCustomer" WHERE "orgId" = ${orgId}::uuid)) AS data3,
    (SELECT COUNT(*) FROM "LoyaltyRedeem" WHERE "status" = 'CLAIMED' AND "customerId" IN (SELECT id FROM "LoyaltyCustomer" WHERE "orgId" = ${orgId}::uuid)) AS data4,
    (SELECT SUM("redeemedPoints") FROM "LoyaltyCustomer" lc WHERE lc."orgId" = ${orgId}::uuid) AS data5
    `;

  const { data1, data2, data3, data4, data5 } = results?.[0];

  const summaryData = [
    { title: "Total Customers", id: 2, value: Number(data1) || 0 },
    { title: "Point Issued", id: 5, value: Number(data2) || 0 },
    { title: "Point Redeemed", id: 7, value: Number(data5) || 0 },
    { title: "Reward Redeems", id: 4, value: Number(data3) || 0 },
    { title: "Reward Claimed", id: 6, value: Number(data4) || 0 },
  ];

  const overallActionsResult = await prisma.$queryRaw<
    { date: string; totalactions: number; type: string }[]
  >`SELECT 
    DATE_TRUNC('day', lacm."createdAt") AS date,
    COUNT(lacm."actionId") AS totalactions,
    la.type AS type
FROM 
    "LoyaltyActionCustomerMap" lacm
JOIN 
    "LoyaltyCustomer" lc ON lacm."customerId" = lc.id
JOIN 
    "LoyaltyAction" la ON lacm."actionId" = la.id
WHERE 
    lc."orgId" = ${orgId}::uuid
GROUP BY 
    DATE_TRUNC('day', lacm."createdAt"), la.type
ORDER BY 
    date`;

  const overallActionsData = overallActionsResult.map((item) => ({
    name: item.date,
    totalActions: Number(item.totalactions),
    type: item.type,
  }));

  const topActionsResult = await prisma.$queryRaw<
    { name: string; type: string; points: number; participants: bigint }[]
  >`SELECT 
    la.name AS name,
    la.type AS type,
    la.points AS points,
    COUNT(lacm."customerId") AS participants
FROM 
    "LoyaltyAction" la
JOIN 
    "LoyaltyActionCustomerMap" lacm ON la.id = lacm."actionId"
WHERE 
    la."orgId" = ${orgId}::uuid
GROUP BY 
    la.id, la.name, la.type, la.points
ORDER BY 
    participants DESC
LIMIT 10`;

  const topActionsData = topActionsResult.map((item) => ({
    name: {
      title: item.name,
      type: item.type,
    },
    participants: Number(item.participants),
    points: Number(item.points),
  }));

  const result = await prisma.$queryRaw<
    { name: string; total_actions: bigint; recent_actions: bigint }[]
  >`SELECT 
co.name AS name,
COUNT(lacm."actionId") AS total_actions,
COUNT(CASE 
        WHEN lacm."createdAt" >= NOW() - INTERVAL '7 days' 
        THEN lacm."actionId" 
        END) AS recent_actions
FROM 
"LoyaltyActionCustomerMap" lacm
JOIN 
"LoyaltyCustomer" c ON lacm."customerId" = c.id
JOIN
"Contact" co on c."contactId" = co.id
WHERE 
c."orgId" = ${orgId}::uuid
GROUP BY 
c.id, co.name
ORDER BY 
total_actions DESC
LIMIT 10`;

  const topPerformersData = result.map((item) => ({
    name: item.name,
    total_actions: Number(item.total_actions),
    recent_actions: Number(item.recent_actions),
  }));

  const rewardResult = await prisma.$queryRaw<
    { name: string; required_points: bigint; times_redeemed: bigint }[]
  >`SELECT 
    lrew.name AS name,
    lrew.points AS required_points,
    COUNT(lr.id) AS times_redeemed
FROM 
    "LoyaltyRedeem" lr
JOIN 
    "LoyaltyReward" lrew ON lr."rewardId" = lrew.id
JOIN 
    "LoyaltyCustomer" lc ON lr."customerId" = lc.id
WHERE 
    lc."orgId" = ${orgId}::uuid
GROUP BY 
    lrew.id, lrew.name
ORDER BY 
    times_redeemed DESC
LIMIT 10`;

  const topRedeemedRewardsData = rewardResult.map((item) => ({
    name: item.name,
    times_redeemed: Number(item.times_redeemed),
    required_points: Number(item.required_points),
  }));

  return {
    summaryData,
    overallActionsData,
    topActionsData,
    topPerformersData,
    topRedeemedRewardsData,
  };
};
