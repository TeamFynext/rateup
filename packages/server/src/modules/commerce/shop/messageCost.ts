import type { ShopAttribution } from "./shop.types.js";
import { round2 } from "./pricing.js";

export const MESSAGE_CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION", "SERVICE"] as const;
export type MessageCategory = (typeof MESSAGE_CATEGORIES)[number];
export type MessageRates = Record<MessageCategory, number>;

/**
 * Rough USD prices per delivered message, used until the merchant enters their own. Meta
 * prices by the recipient's country and volume tier, so these are a starting point only.
 * Service replies are billed at the utility rate from 1 October 2026.
 */
export const ESTIMATED_USD_RATES: MessageRates = {
  MARKETING: 0.025,
  UTILITY: 0.004,
  AUTHENTICATION: 0.004,
  SERVICE: 0.004,
};

/** Orders count towards the last campaign or automation message within this long before them. */
export const ATTRIBUTION_DAYS = 7;

export function ratesFor(store: { currency: string; messageRates: unknown }): {
  rates: MessageRates | null;
  estimated: boolean;
} {
  const saved = store.messageRates as Partial<MessageRates> | null;
  if (saved && MESSAGE_CATEGORIES.every((c) => typeof saved[c] === "number")) {
    return { rates: saved as MessageRates, estimated: false };
  }
  // The estimates are in USD; in any other currency they would be off by the exchange rate.
  return store.currency === "USD"
    ? { rates: ESTIMATED_USD_RATES, estimated: true }
    : { rates: null, estimated: true };
}

export type SourceKind = "campaign" | "automation" | "template" | "inbox" | "ad" | "instagram";

export interface Source {
  key: string;
  kind: SourceKind;
  /** Campaign id or ad id; the label is looked up separately. */
  refId?: string;
  label?: string;
}

/** Which bucket a sent message belongs to: its campaign, or what kind of send it was. */
export function messageSource(row: { campaignId: string | null; source: string | null }): Source {
  if (row.campaignId)
    return { key: `campaign:${row.campaignId}`, kind: "campaign", refId: row.campaignId };
  switch ((row.source ?? "").toUpperCase()) {
    case "AUTOMATED":
    case "FLOW":
      return { key: "automation", kind: "automation" };
    case "TEMPLATE":
    case "CAMPAIGN":
      return { key: "template", kind: "template" };
    default:
      return { key: "inbox", kind: "inbox" };
  }
}

/**
 * Where an order came from. What the order itself recorded (an ad, an Instagram comment, a
 * campaign link) wins over the last message the customer got before it.
 */
export function orderSource(
  attribution: ShopAttribution | null | undefined,
  lastTouch: Source | undefined,
): Source | undefined {
  switch (attribution?.kind) {
    case "ctwa_ad":
      return {
        key: `ad:${attribution.adId ?? "unknown"}`,
        kind: "ad",
        refId: attribution.adId,
        label: attribution.adTitle,
      };
    case "ig_comment":
    case "ig_story":
      return { key: "instagram", kind: "instagram" };
    case "campaign":
      if (attribution.campaignId) {
        return {
          key: `campaign:${attribution.campaignId}`,
          kind: "campaign",
          refId: attribution.campaignId,
        };
      }
  }
  return lastTouch;
}

export interface MessageCount {
  source: Source;
  category: MessageCategory | null;
  billable: boolean;
  count: number;
}

export interface PaidOrder {
  total: number;
  source: Source | undefined;
}

export interface SourceRow extends Source {
  messages: number;
  billableMessages: number;
  cost: number | null;
  orders: number;
  revenue: number;
  /** Revenue per unit of cost; null when nothing was spent or the cost is unknown. */
  roi: number | null;
}

/** Joins what each source cost with what it sold. Free messages (service window, ad entry point) cost nothing. */
export function buildMessageReport(
  messages: MessageCount[],
  orders: PaidOrder[],
  rates: MessageRates | null,
) {
  const rows = new Map<string, SourceRow>();
  const row = (s: Source) => {
    let r = rows.get(s.key);
    if (!r) {
      r = {
        ...s,
        messages: 0,
        billableMessages: 0,
        cost: rates ? 0 : null,
        orders: 0,
        revenue: 0,
        roi: null,
      };
      rows.set(s.key, r);
    }
    if (!r.label && s.label) r.label = s.label;
    return r;
  };

  const byCategory = new Map(
    MESSAGE_CATEGORIES.map((c) => [
      c,
      { category: c, billable: 0, free: 0, cost: rates ? 0 : null },
    ]),
  );
  for (const m of messages) {
    const r = row(m.source);
    r.messages += m.count;
    const charged = m.billable && m.category !== null;
    const cost = charged && rates ? rates[m.category!] * m.count : 0;
    if (charged) r.billableMessages += m.count;
    if (r.cost !== null) r.cost += cost;
    if (m.category) {
      const c = byCategory.get(m.category)!;
      if (charged) c.billable += m.count;
      else c.free += m.count;
      if (c.cost !== null) c.cost += cost;
    }
  }

  let revenue = 0;
  let attributedRevenue = 0;
  for (const o of orders) {
    revenue += o.total;
    if (!o.source) continue;
    attributedRevenue += o.total;
    const r = row(o.source);
    r.orders++;
    r.revenue += o.total;
  }

  const sources = [...rows.values()].map((r) => {
    const cost = r.cost === null ? null : round2(r.cost);
    return {
      ...r,
      cost,
      revenue: round2(r.revenue),
      roi: cost ? round2(r.revenue / cost) : null,
    };
  });
  sources.sort((a, b) => b.revenue - a.revenue || (b.cost ?? 0) - (a.cost ?? 0));

  const totalCost = rates ? round2(sources.reduce((s, r) => s + (r.cost ?? 0), 0)) : null;
  return {
    totals: {
      billableMessages: sources.reduce((s, r) => s + r.billableMessages, 0),
      cost: totalCost,
      revenue: round2(revenue),
      attributedRevenue: round2(attributedRevenue),
      orders: orders.length,
      roi: totalCost ? round2(attributedRevenue / totalCost) : null,
    },
    byCategory: [...byCategory.values()].map((c) => ({
      ...c,
      cost: c.cost === null ? null : round2(c.cost),
    })),
    sources,
  };
}
