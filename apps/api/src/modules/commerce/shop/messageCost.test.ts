import { describe, expect, test } from "vite-plus/test";

import {
  buildMessageReport,
  ESTIMATED_USD_RATES,
  messageSource,
  orderSource,
  ratesFor,
} from "./messageCost.js";

const rates = { MARKETING: 0.05, UTILITY: 0.01, AUTHENTICATION: 0.01, SERVICE: 0.01 };
const spring = messageSource({ campaignId: "c1", source: "CAMPAIGN" });
const automation = messageSource({ campaignId: null, source: "AUTOMATED" });
const inbox = messageSource({ campaignId: null, source: "inbox" });

describe("rates", () => {
  test("uses the merchant's own rates once all four are set", () => {
    expect(ratesFor({ currency: "EUR", messageRates: rates })).toEqual({ rates, estimated: false });
  });

  test("falls back to the USD estimates only for a USD store", () => {
    expect(ratesFor({ currency: "USD", messageRates: null })).toEqual({
      rates: ESTIMATED_USD_RATES,
      estimated: true,
    });
    expect(ratesFor({ currency: "EUR", messageRates: { MARKETING: 1 } })).toEqual({
      rates: null,
      estimated: true,
    });
  });
});

describe("sources", () => {
  test("a campaign message goes to its campaign, other sends to their kind", () => {
    expect(spring).toMatchObject({ key: "campaign:c1", kind: "campaign", refId: "c1" });
    expect(messageSource({ campaignId: null, source: "FLOW" }).key).toBe("automation");
    expect(messageSource({ campaignId: null, source: "TEMPLATE" }).key).toBe("template");
    expect(inbox.key).toBe("inbox");
  });

  test("what the order recorded beats the last message before it", () => {
    expect(
      orderSource({ kind: "ctwa_ad", adId: "a9", adTitle: "Fall sale" }, spring),
    ).toMatchObject({ key: "ad:a9", kind: "ad", label: "Fall sale" });
    expect(orderSource({ kind: "ig_comment" }, spring)?.key).toBe("instagram");
    expect(orderSource({ kind: "storefront" }, spring)?.key).toBe("campaign:c1");
    expect(orderSource(null, undefined)).toBeUndefined();
  });
});

describe("report", () => {
  test("costs only billable messages and sets each source's spend against its sales", () => {
    const report = buildMessageReport(
      [
        { source: spring, category: "MARKETING", billable: true, count: 100 },
        { source: automation, category: "UTILITY", billable: true, count: 20 },
        // Inside the free service window, or the free entry point after an ad.
        { source: inbox, category: "SERVICE", billable: false, count: 50 },
      ],
      [
        { total: 40, source: spring },
        { total: 10, source: spring },
        { total: 25, source: undefined },
      ],
      rates,
    );

    expect(report.totals).toEqual({
      billableMessages: 120,
      cost: 5.2,
      revenue: 75,
      attributedRevenue: 50,
      orders: 3,
      roi: 9.62,
    });
    expect(report.sources[0]).toMatchObject({
      key: "campaign:c1",
      cost: 5,
      orders: 2,
      revenue: 50,
      roi: 10,
    });
    expect(report.sources.find((s) => s.key === "inbox")).toMatchObject({
      messages: 50,
      billableMessages: 0,
      cost: 0,
      roi: null,
    });
    expect(report.byCategory.find((c) => c.category === "SERVICE")).toEqual({
      category: "SERVICE",
      billable: 0,
      free: 50,
      cost: 0,
    });
  });

  test("still counts messages and sales when the cost is unknown", () => {
    const report = buildMessageReport(
      [{ source: spring, category: "MARKETING", billable: true, count: 3 }],
      [{ total: 12, source: spring }],
      null,
    );
    expect(report.totals.cost).toBeNull();
    expect(report.totals.roi).toBeNull();
    expect(report.sources[0]).toMatchObject({ billableMessages: 3, cost: null, revenue: 12 });
  });
});
