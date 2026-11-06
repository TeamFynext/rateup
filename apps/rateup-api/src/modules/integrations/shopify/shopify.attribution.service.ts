import { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";

export interface FunnelCounts {
  sent: number;
  failed: number;
  delivered: number;
  read: number;
  clicked: number;
  recovered: number;
}

export interface RevenueByCurrency {
  currency: string;
  amount: string;
}

export interface AttributionReport {
  from: string;
  to: string;
  totals: FunnelCounts & {
    revenue: RevenueByCurrency[];
    /** Checkouts that came back with no reminder sent — the buyer returned on their own. */
    recoveredWithoutReminder: number;
  };
  byRule: Array<FunnelCounts & { ruleId: string; ruleName: string; revenue: RevenueByCurrency[] }>;
  byDay: Array<{
    day: string;
    sent: number;
    clicked: number;
    recovered: number;
    revenue: RevenueByCurrency[];
  }>;
}

interface FunnelRow {
  ruleId: string;
  ruleName: string;
  sent: bigint;
  failed: bigint;
  delivered: bigint;
  read: bigint;
  clicked: bigint;
  recovered: bigint;
}

interface RevenueRow {
  key: string;
  currency: string | null;
  amount: Prisma.Decimal | null;
}

const toNumber = (value: bigint | number | null | undefined) => Number(value ?? 0);

function groupRevenue(rows: RevenueRow[]) {
  const byKey = new Map<string, RevenueByCurrency[]>();
  for (const row of rows) {
    if (!row.currency || row.amount == null) continue;
    const list = byKey.get(row.key) ?? [];
    list.push({ currency: row.currency, amount: row.amount.toFixed(2) });
    byKey.set(row.key, list);
  }
  return byKey;
}

/**
 * What the org's cart reminders did in [from, to). Everything is counted over the reminders
 * *sent* in the period, so a funnel's steps describe the same messages: a reminder sent on
 * the 31st whose order lands on the 2nd counts in the period it was sent.
 *
 * Delivered and read come from the sent message's WhatsApp status timestamps.
 */
export async function getShopifyAttribution(
  orgId: string,
  from: Date,
  to: Date,
): Promise<AttributionReport> {
  // A failed send has no sentAt; its attempt time is when it was marked FAILED.
  const attemptedAt = Prisma.sql`COALESCE(r."sentAt", r."updatedAt")`;
  const inPeriod = Prisma.sql`
    c."orgId" = ${orgId}::uuid
    AND r.status IN ('SENT', 'FAILED')
    AND ${attemptedAt} >= ${from} AND ${attemptedAt} < ${to}`;

  const funnel = await prisma.$queryRaw<FunnelRow[]>`
    SELECT r."ruleId", ru.name AS "ruleName",
      COUNT(*) FILTER (WHERE r.status = 'SENT') AS sent,
      COUNT(*) FILTER (WHERE r.status = 'FAILED') AS failed,
      COUNT(*) FILTER (
        WHERE COALESCE(wm.stats->>'delivered', '') <> '' OR COALESCE(wm.stats->>'read', '') <> ''
      ) AS delivered,
      COUNT(*) FILTER (WHERE COALESCE(wm.stats->>'read', '') <> '') AS read,
      COUNT(*) FILTER (WHERE r."clickedAt" IS NOT NULL) AS clicked,
      COUNT(*) FILTER (WHERE r."attributedOrderId" IS NOT NULL) AS recovered
    FROM "ShopifyCheckoutReminder" r
    JOIN "ShopifyCheckout" c ON c.id = r."checkoutId"
    JOIN "Rule" ru ON ru.id = r."ruleId"
    LEFT JOIN "WaMessage" wm ON wm."messageId" = r."waMessageId"
    WHERE ${inPeriod}
    GROUP BY r."ruleId", ru.name
    ORDER BY ru.name`;

  const ruleRevenue = await prisma.$queryRaw<RevenueRow[]>`
    SELECT r."ruleId" AS key, r.currency, SUM(r.revenue) AS amount
    FROM "ShopifyCheckoutReminder" r
    JOIN "ShopifyCheckout" c ON c.id = r."checkoutId"
    WHERE ${inPeriod} AND r."attributedOrderId" IS NOT NULL
    GROUP BY r."ruleId", r.currency`;

  const days = await prisma.$queryRaw<
    Array<{ day: string; sent: bigint; clicked: bigint; recovered: bigint }>
  >`
    SELECT to_char(date_trunc('day', ${attemptedAt}), 'YYYY-MM-DD') AS day,
      COUNT(*) FILTER (WHERE r.status = 'SENT') AS sent,
      COUNT(*) FILTER (WHERE r."clickedAt" IS NOT NULL) AS clicked,
      COUNT(*) FILTER (WHERE r."attributedOrderId" IS NOT NULL) AS recovered
    FROM "ShopifyCheckoutReminder" r
    JOIN "ShopifyCheckout" c ON c.id = r."checkoutId"
    WHERE ${inPeriod}
    GROUP BY 1 ORDER BY 1`;

  const dayRevenue = await prisma.$queryRaw<RevenueRow[]>`
    SELECT to_char(date_trunc('day', ${attemptedAt}), 'YYYY-MM-DD') AS key, r.currency,
      SUM(r.revenue) AS amount
    FROM "ShopifyCheckoutReminder" r
    JOIN "ShopifyCheckout" c ON c.id = r."checkoutId"
    WHERE ${inPeriod} AND r."attributedOrderId" IS NOT NULL
    GROUP BY 1, r.currency`;

  const [{ count: recoveredWithoutReminder }] = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) AS count
    FROM "ShopifyCheckout" c
    WHERE c."orgId" = ${orgId}::uuid
      AND c.status = 'RECOVERED'
      AND c."updatedAt" >= ${from} AND c."updatedAt" < ${to}
      AND NOT EXISTS (
        SELECT 1 FROM "ShopifyCheckoutReminder" r
        WHERE r."checkoutId" = c.id AND r.status = 'SENT'
      )`;

  const revenueByRule = groupRevenue(ruleRevenue);
  const revenueByDay = groupRevenue(dayRevenue);

  const byRule = funnel.map((row) => ({
    ruleId: row.ruleId,
    ruleName: row.ruleName,
    sent: toNumber(row.sent),
    failed: toNumber(row.failed),
    delivered: toNumber(row.delivered),
    read: toNumber(row.read),
    clicked: toNumber(row.clicked),
    recovered: toNumber(row.recovered),
    revenue: revenueByRule.get(row.ruleId) ?? [],
  }));

  const totalRevenue = new Map<string, Prisma.Decimal>();
  for (const row of ruleRevenue) {
    if (!row.currency || row.amount == null) continue;
    totalRevenue.set(
      row.currency,
      (totalRevenue.get(row.currency) ?? new Prisma.Decimal(0)).plus(row.amount),
    );
  }
  const sum = (field: keyof FunnelCounts) => byRule.reduce((total, row) => total + row[field], 0);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    totals: {
      sent: sum("sent"),
      failed: sum("failed"),
      delivered: sum("delivered"),
      read: sum("read"),
      clicked: sum("clicked"),
      recovered: sum("recovered"),
      revenue: [...totalRevenue].map(([currency, amount]) => ({
        currency,
        amount: amount.toFixed(2),
      })),
      recoveredWithoutReminder: toNumber(recoveredWithoutReminder),
    },
    byRule,
    byDay: days.map((row) => ({
      day: row.day,
      sent: toNumber(row.sent),
      clicked: toNumber(row.clicked),
      recovered: toNumber(row.recovered),
      revenue: revenueByDay.get(row.day) ?? [],
    })),
  };
}
