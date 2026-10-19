import { describe, expect, test } from "vitest";
import { mergeAdReport } from "./adReport.service.js";
import { buildMessageReport } from "./messageCost.js";

const rates = { MARKETING: 0.025, UTILITY: 0.004, AUTHENTICATION: 0.004, SERVICE: 0.004 };
const ad = (id: string) => ({ key: `ad:${id}`, kind: "ad" as const, refId: id });

describe("the per-ad report", () => {
  test("puts each ad's clicks next to its cost and sales", () => {
    const report = buildMessageReport(
      [
        { source: ad("a"), category: "SERVICE", billable: false, count: 6 },
        { source: ad("a"), category: "MARKETING", billable: true, count: 40 },
      ],
      [
        { total: 30, source: { ...ad("a"), label: "Summer" } },
        { total: 20, source: ad("b") },
      ],
      rates,
    );
    const rows = mergeAdReport(
      [
        {
          adId: "a",
          headline: "Summer Sale",
          sourceUrl: null,
          mediaUrl: null,
          clicks: 12,
          people: 9,
        },
        { adId: "c", headline: "Quiet ad", sourceUrl: null, mediaUrl: null, clicks: 3, people: 3 },
      ],
      report,
    );
    expect(rows).toEqual([
      expect.objectContaining({
        adId: "a",
        headline: "Summer Sale",
        clicks: 12,
        people: 9,
        billableMessages: 40,
        cost: 1,
        orders: 1,
        revenue: 30,
        roi: 30,
      }),
      expect.objectContaining({ adId: "b", clicks: 0, orders: 1, revenue: 20, cost: 0 }),
      expect.objectContaining({ adId: "c", clicks: 3, orders: 0, revenue: 0, cost: 0 }),
    ]);
  });

  test("leaves cost unknown without rates", () => {
    const report = buildMessageReport([], [], null);
    const [row] = mergeAdReport(
      [{ adId: "a", headline: null, sourceUrl: null, mediaUrl: null, clicks: 1, people: 1 }],
      report,
    );
    expect(row.cost).toBeNull();
  });
});
