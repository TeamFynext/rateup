import type { ShopStore } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { AD_ATTRIBUTION_DAYS } from "./attribution.js";
import {
  buildMessageReport,
  MESSAGE_CATEGORIES,
  orderSource,
  ratesFor,
  type MessageCategory,
  type Source,
} from "./messageCost.js";
import { toNumber } from "./pricing.js";

interface ClickRow {
  adId: string;
  headline: string | null;
  sourceUrl: string | null;
  mediaUrl: string | null;
  clicks: number;
  people: number;
}

interface AdMessageRow {
  adId: string;
  category: string | null;
  billable: boolean;
  n: number;
}

export interface AdReportRow {
  adId: string;
  headline: string | null;
  sourceUrl: string | null;
  mediaUrl: string | null;
  clicks: number;
  people: number;
  billableMessages: number;
  cost: number | null;
  orders: number;
  revenue: number;
  roi: number | null;
}

const adSource = (adId: string): Source => ({ key: `ad:${adId}`, kind: "ad", refId: adId });
const isCategory = (c: string | null): c is MessageCategory =>
  MESSAGE_CATEGORIES.includes(c as MessageCategory);

/** Joins each ad's clicks with what its conversations cost and the paid orders it brought in. */
export function mergeAdReport(
  clicks: ClickRow[],
  report: ReturnType<typeof buildMessageReport>,
): AdReportRow[] {
  const bySource = new Map(report.sources.map((s) => [s.refId ?? "", s]));
  const ids = new Set([...clicks.map((c) => c.adId), ...bySource.keys()].filter(Boolean));
  const clickOf = new Map(clicks.map((c) => [c.adId, c]));
  const rows = [...ids].map((adId) => {
    const c = clickOf.get(adId);
    const s = bySource.get(adId);
    return {
      adId,
      headline: c?.headline ?? s?.label ?? null,
      sourceUrl: c?.sourceUrl ?? null,
      mediaUrl: c?.mediaUrl ?? null,
      clicks: c?.clicks ?? 0,
      people: c?.people ?? 0,
      billableMessages: s?.billableMessages ?? 0,
      cost: s ? s.cost : report.totals.cost === null ? null : 0,
      orders: s?.orders ?? 0,
      revenue: s?.revenue ?? 0,
      roi: s?.roi ?? null,
    };
  });
  return rows.sort((a, b) => b.revenue - a.revenue || b.clicks - a.clicks);
}

/**
 * Click-to-WhatsApp ads in [from, to): clicks and people from the ad, the messages sent to
 * them in the week after each click, and the paid orders credited to the ad.
 */
export async function getAdReport(store: ShopStore, from: Date, to: Date) {
  const { rates, estimated } = ratesFor(store);

  const clicks = await prisma.$queryRaw<ClickRow[]>`
    SELECT r."sourceId" AS "adId",
           (array_agg(r.headline ORDER BY r."createdAt" DESC))[1] AS headline,
           (array_agg(r."sourceUrl" ORDER BY r."createdAt" DESC))[1] AS "sourceUrl",
           (array_agg(r."mediaUrl" ORDER BY r."createdAt" DESC))[1] AS "mediaUrl",
           COUNT(*)::int AS clicks,
           COUNT(DISTINCT r."contactId")::int AS people
    FROM "AdReferral" r
    WHERE r."orgId" = ${store.orgId}::uuid AND r."sourceType" = 'ad'
      AND r."createdAt" >= ${from} AND r."createdAt" < ${to}
    GROUP BY r."sourceId"`;

  // A message to someone who clicked two ads in a week counts once for each ad it followed.
  const messages = await prisma.$queryRaw<AdMessageRow[]>`
    SELECT r."sourceId" AS "adId",
           wm."pricingCategory"::text AS category,
           COALESCE(wm."pricingBillable", false) AS billable,
           COUNT(DISTINCT wm.id)::int AS n
    FROM "AdReferral" r
    JOIN "WaMessage" wm ON wm."contactId" = r."contactId"
      AND wm."createdAt" >= r."createdAt"
      AND wm."createdAt" < r."createdAt" + make_interval(days => ${AD_ATTRIBUTION_DAYS}::int)
    WHERE r."orgId" = ${store.orgId}::uuid AND r."sourceType" = 'ad'
      AND r."createdAt" >= ${from} AND r."createdAt" < ${to}
      AND wm."pricingCategory" IS NOT NULL
    GROUP BY 1, 2, 3`;

  const paid = await prisma.shopOrder.findMany({
    where: {
      storeId: store.id,
      currency: store.currency,
      paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] },
      paidAt: { gte: from, lt: to },
      attribution: { path: ["kind"], equals: "ctwa_ad" },
    },
    select: { total: true, attribution: true },
  });

  const report = buildMessageReport(
    messages.map((m) => ({
      source: adSource(m.adId),
      category: isCategory(m.category) ? m.category : null,
      billable: m.billable,
      count: m.n,
    })),
    paid.map((o) => ({ total: toNumber(o.total), source: orderSource(o.attribution, undefined) })),
    rates,
  );

  return {
    currency: store.currency,
    range: { from, to },
    ratesEstimated: estimated,
    attributionDays: AD_ATTRIBUTION_DAYS,
    ads: mergeAdReport(clicks, report),
  };
}
