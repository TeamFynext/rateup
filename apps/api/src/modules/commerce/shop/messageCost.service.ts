import { Prisma, type ShopStore } from "../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import {
  ATTRIBUTION_DAYS,
  buildMessageReport,
  MESSAGE_CATEGORIES,
  messageSource,
  orderSource,
  ratesFor,
  type MessageCategory,
  type MessageRates,
} from "./messageCost.js";
import { toNumber } from "./pricing.js";

interface MessageRow {
  campaignId: string | null;
  source: string | null;
  category: string | null;
  billable: boolean;
  n: number;
}

interface TouchRow {
  orderId: string;
  campaignId: string | null;
  source: string | null;
}

const isCategory = (c: string | null): c is MessageCategory =>
  MESSAGE_CATEGORIES.includes(c as MessageCategory);

/**
 * What the shop's WhatsApp messages cost in [from, to) next to the paid orders they brought
 * in, overall, per campaign and per kind of send.
 */
export async function getMessageReport(store: ShopStore, from: Date, to: Date) {
  const { rates, estimated } = ratesFor(store);

  // Only outbound WhatsApp messages carry Meta's pricing, so the category filter is also
  // the direction filter.
  const messageRows = await prisma.$queryRaw<MessageRow[]>`
    SELECT cp."campaignId" AS "campaignId",
           wm."sourceMessage" AS source,
           wm."pricingCategory"::text AS category,
           COALESCE(wm."pricingBillable", false) AS billable,
           COUNT(*)::int AS n
    FROM "WaMessage" wm
    JOIN "Contact" c ON c.id = wm."contactId"
    LEFT JOIN "WaMessageCampaginParticipantMap" m ON m."waMessageId" = wm.id
    LEFT JOIN "CampaignParticipant" cp ON cp.id = m."campaignParticipantId"
    WHERE c."orgId" = ${store.orgId}::uuid
      AND wm."createdAt" >= ${from} AND wm."createdAt" < ${to}
      AND wm."pricingCategory" IS NOT NULL
    GROUP BY 1, 2, 3, 4`;

  const paid = await prisma.shopOrder.findMany({
    where: {
      storeId: store.id,
      currency: store.currency,
      paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] },
      paidAt: { gte: from, lt: to },
    },
    select: { id: true, total: true, contactId: true, attribution: true },
  });

  const needTouch = paid.filter((o) => o.contactId).map((o) => o.id);
  const touches = needTouch.length
    ? await prisma.$queryRaw<TouchRow[]>`
        SELECT DISTINCT ON (o.id) o.id AS "orderId", cp."campaignId" AS "campaignId",
               wm."sourceMessage" AS source
        FROM "ShopOrder" o
        JOIN "WaMessage" wm ON wm."contactId" = o."contactId"
          AND wm."createdAt" <= o."createdAt"
          AND wm."createdAt" > o."createdAt" - make_interval(days => ${ATTRIBUTION_DAYS}::int)
        LEFT JOIN "WaMessageCampaginParticipantMap" m ON m."waMessageId" = wm.id
        LEFT JOIN "CampaignParticipant" cp ON cp.id = m."campaignParticipantId"
        WHERE o.id = ANY(${needTouch}::uuid[])
          AND (cp."campaignId" IS NOT NULL
               OR UPPER(wm."sourceMessage") IN ('CAMPAIGN', 'TEMPLATE', 'AUTOMATED', 'FLOW'))
        ORDER BY o.id, wm."createdAt" DESC`
    : [];
  const lastTouch = new Map(touches.map((t) => [t.orderId, messageSource(t)]));

  const report = buildMessageReport(
    messageRows.map((r) => ({
      source: messageSource(r),
      category: isCategory(r.category) ? r.category : null,
      billable: r.billable,
      count: r.n,
    })),
    paid.map((o) => ({
      total: toNumber(o.total),
      source: orderSource(o.attribution, lastTouch.get(o.id)),
    })),
    rates,
  );

  const campaignIds = report.sources.flatMap((s) =>
    s.kind === "campaign" && s.refId ? [s.refId] : [],
  );
  const campaigns = campaignIds.length
    ? await prisma.campaign.findMany({
        where: { id: { in: campaignIds }, team: { orgId: store.orgId } },
        select: { id: true, name: true },
      })
    : [];
  const names = new Map(campaigns.map((c) => [c.id, c.name]));

  return {
    currency: store.currency,
    range: { from, to },
    rates,
    ratesEstimated: estimated,
    attributionDays: ATTRIBUTION_DAYS,
    ...report,
    sources: report.sources.map((s) =>
      s.kind === "campaign" && s.refId ? { ...s, label: names.get(s.refId) ?? s.label } : s,
    ),
  };
}

export async function setMessageRates(store: ShopStore, rates: MessageRates | null) {
  const updated = await prisma.shopStore.update({
    where: { id: store.id },
    data: { messageRates: rates ?? Prisma.DbNull },
  });
  return ratesFor(updated);
}
