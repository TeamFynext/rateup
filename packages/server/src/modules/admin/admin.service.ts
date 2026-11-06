import dayjs from "dayjs";

import prisma from "../../utils/prisma.js";

/** One month of a time series. `month` is an ISO `YYYY-MM-01` so the client can sort it. */
export interface MonthlyPoint {
  month: string;
  value: number;
}

export interface AdminOverview {
  generatedAt: string;
  months: number;
  totals: {
    orgs: number;
    users: number;
    activeUsers: number;
    paidSubscriptions: number;
    /** Gross, all time, in INR. See the note on `revenue` below. */
    revenueAllTime: number;
    revenueThisMonth: number;
    /** Recurring revenue per month, from what paying orgs are on right now. */
    mrr: number;
    /** Mean monthly revenue per paying account. */
    arpa: number;
  };
  /**
   * Gross receipts by month, from captured payments, in **rupees**.
   *
   * `Payments.amount` holds the gateway's minor units — the webhook writes Razorpay's
   * paise straight through — while `RateupPlan.price` is in rupees. Everything here is
   * normalised to rupees so revenue and MRR can sit on the same page without being a
   * hundredfold apart.
   *
   * INR only, and deliberately not currency-converted: the catalog prices in INR and
   * every live subscription charges it, so summing a mixed set would silently invent a
   * rate. If Stripe ever bills in USD this needs a real conversion, not an addition.
   */
  revenue: MonthlyPoint[];
  signups: { orgs: MonthlyPoint[]; users: MonthlyPoint[] };
  /** How paying accounts are spread across the catalog. */
  planMix: { plan: string; orgs: number }[];
  /** Checkout outcomes, which is where a broken payment path shows up first. */
  orderOutcomes: { status: string; orders: number }[];
  /** Product usage across every org — a snapshot, since the counters are not historical. */
  usage: {
    conversations: number;
    formSubmissions: number;
    messages: number;
    aiTokens: number;
    campaigns: number;
  };
  /** The heaviest accounts, which is who a capacity conversation is about. */
  topOrgsByConversations: { orgId: string; org: string; conversations: number }[];
}

/** Zero-filled month buckets, so a quiet month is a gap in the line rather than a missing point. */
function emptyMonths(months: number): Map<string, number> {
  const buckets = new Map<string, number>();
  for (let index = months - 1; index >= 0; index--) {
    buckets.set(dayjs().subtract(index, "month").startOf("month").format("YYYY-MM-01"), 0);
  }
  return buckets;
}

function toSeries(buckets: Map<string, number>): MonthlyPoint[] {
  return [...buckets.entries()].map(([month, value]) => ({ month, value }));
}

function fill(buckets: Map<string, number>, rows: { month: Date; value: number | bigint }[]) {
  for (const row of rows) {
    const key = dayjs(row.month).format("YYYY-MM-01");
    if (buckets.has(key)) buckets.set(key, Number(row.value));
  }
  return toSeries(buckets);
}

/**
 * Everything the admin dashboard plots, aggregated in the database.
 *
 * Deliberately one endpoint doing `GROUP BY` rather than the page pulling every order and
 * summing in the browser: the payment tables grow without bound, and a dashboard that
 * ships the whole history to a laptop stops working exactly when the business gets
 * interesting.
 *
 * There is no profit here, and that is not an oversight. Profit needs costs, and nothing
 * in this system records any — infrastructure is not attributed per org, gateway fees are
 * not stored on payments, and message delivery is billed by Meta straight to the
 * customer's own WABA, so it never passes through Rateup's books at all. A "profit" chart
 * would be revenue with a made-up number subtracted from it.
 */
export async function getAdminOverview(months = 12): Promise<AdminOverview> {
  const since = dayjs()
    .subtract(months - 1, "month")
    .startOf("month");
  const sinceDate = since.toDate();
  // Payments store their timestamp as unix seconds, not a date.
  const sinceUnix = since.unix();

  const [
    orgs,
    users,
    activeUsers,
    revenueRows,
    revenueAllTime,
    orgSignupRows,
    userSignupRows,
    planRows,
    orderRows,
    usage,
    topOrgs,
  ] = await Promise.all([
    prisma.org.count(),
    prisma.user.count(),
    prisma.user.count({ where: { active: true } }),

    prisma.$queryRaw<{ month: Date; value: number }[]>`
      SELECT date_trunc('month', to_timestamp("createdAt")) AS month,
             (SUM(amount) / 100.0)::float AS value
      FROM "Payments"
      WHERE "createdAt" >= ${sinceUnix} AND currency = 'INR'
      GROUP BY 1 ORDER BY 1`,
    prisma.payments.aggregate({ _sum: { amount: true }, where: { currency: "INR" } }),

    prisma.$queryRaw<{ month: Date; value: bigint }[]>`
      SELECT date_trunc('month', "createdAt") AS month, COUNT(*) AS value
      FROM "Org" WHERE "createdAt" >= ${sinceDate} GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ month: Date; value: bigint }[]>`
      SELECT date_trunc('month', "createdAt") AS month, COUNT(*) AS value
      FROM "User" WHERE "createdAt" >= ${sinceDate} GROUP BY 1 ORDER BY 1`,

    prisma.$queryRaw<{ plan: string; orgs: bigint; price: number | null }[]>`
      SELECT COALESCE(p."displayName", p.name) AS plan, COUNT(s."orgId") AS orgs, p.price
      FROM "Subscription" s
      JOIN "RateupPlan" p ON p.id = s."basePlanId"
      GROUP BY p.id, p."displayName", p.name, p.price
      ORDER BY COUNT(s."orgId") DESC`,

    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),

    prisma.usageStats.aggregate({
      _sum: {
        monthlyMeteredConversationsCount: true,
        monthlySurveyResponses: true,
        messagesCount: true,
        aiPromptTokensCount: true,
        aiCompletionTokensCount: true,
        waAutomationCount: true,
      },
    }),

    prisma.$queryRaw<{ orgId: string; org: string; conversations: number }[]>`
      SELECT o.id AS "orgId", o.name AS org, u."monthlyMeteredConversationsCount"::int AS conversations
      FROM "UsageStats" u JOIN "Org" o ON o.id = u."orgId"
      WHERE u."monthlyMeteredConversationsCount" > 0
      ORDER BY u."monthlyMeteredConversationsCount" DESC
      LIMIT 8`,
  ]);

  const revenue = fill(emptyMonths(months), revenueRows);
  const thisMonth = dayjs().startOf("month").format("YYYY-MM-01");

  // A paying account is one on a tier that carries a price. Free and sales-led tiers
  // have none, so they contribute nothing to recurring revenue.
  const paying = planRows.filter((row) => Number(row.price ?? 0) > 0);
  const paidSubscriptions = paying.reduce((total, row) => total + Number(row.orgs), 0);
  const mrr = paying.reduce((total, row) => total + Number(row.price) * Number(row.orgs), 0);

  return {
    generatedAt: new Date().toISOString(),
    months,
    totals: {
      orgs,
      users,
      activeUsers,
      paidSubscriptions,
      // Minor units in the column, rupees on the page.
      revenueAllTime: Math.round((revenueAllTime._sum.amount ?? 0) / 100),
      revenueThisMonth: revenue.find((point) => point.month === thisMonth)?.value ?? 0,
      mrr,
      arpa: paidSubscriptions > 0 ? Math.round(mrr / paidSubscriptions) : 0,
    },
    revenue,
    signups: {
      orgs: fill(emptyMonths(months), orgSignupRows),
      users: fill(emptyMonths(months), userSignupRows),
    },
    planMix: planRows.map((row) => ({ plan: row.plan, orgs: Number(row.orgs) })),
    orderOutcomes: orderRows.map((row) => ({
      status: row.status,
      orders: row._count._all,
    })),
    usage: {
      conversations: usage._sum.monthlyMeteredConversationsCount ?? 0,
      formSubmissions: usage._sum.monthlySurveyResponses ?? 0,
      messages: usage._sum.messagesCount ?? 0,
      aiTokens: (usage._sum.aiPromptTokensCount ?? 0) + (usage._sum.aiCompletionTokensCount ?? 0),
      campaigns: usage._sum.waAutomationCount ?? 0,
    },
    topOrgsByConversations: topOrgs.map((row) => ({
      orgId: row.orgId,
      org: row.org,
      conversations: Number(row.conversations),
    })),
  };
}
