import type { TFunction } from "i18next";
import { describe, expect, test } from "vitest";

import type { LoyaltyDashboardStats } from "@/backend/loyalty/dashboard/dashboard.query";

import type { GivebackResult } from "../giveback/calculateGiveback";
import { buildMetricTiles } from "./metricTiles";

const t = ((key: string, opts?: Record<string, unknown>) =>
  key.replace(/\{(\w+)\}/g, (_m, name: string) =>
    String(opts?.[name] ?? ""),
  )) as unknown as TFunction;

const giveback = { pointValue: { best: 0.24, worst: 0.2 } } as unknown as GivebackResult;

const dashboard = {
  metrics: {
    totalMembers: 957,
    revenue: { current: 584200, previous: 512600, changePct: 14 },
    pointsIssued: { current: 62400, previous: 56200, changePct: 11 },
    pointsRedeemed: { current: 21500, previous: 18200, changePct: 18.1 },
    rewardsRedeemed: { current: 43, previous: 36, changePct: 19.4 },
    redemptionRate: { current: 34.5, previous: 32.4, changePct: 6.5 },
    repeatVisitRate: { current: 62, previous: 57, changePct: 8.8, buyers: 100, repeaters: 62 },
    actualGivebackPct: { current: 2.9, previous: 2.7, changePct: 7.4 },
  },
  giveback: { pointValue: { best: 0.24, worst: 0.2 } },
  liability: {
    outstandingPoints: 184300,
    monetaryValue: 44232,
    enablePointsExpiration: true,
    pointsExpirationMonths: 12,
  },
} as unknown as LoyaltyDashboardStats;

const base = { t, pointsName: "Beans", currencySymbol: "₹", currencyCode: "INR", giveback };

describe("buildMetricTiles", () => {
  test("a draft shows three honest placeholders", () => {
    const tiles = buildMetricTiles({ ...base, programState: "draft", dashboard: undefined });
    expect(tiles.map((tile) => [tile.id, tile.value])).toEqual([
      ["members", "—"],
      ["revenue", "—"],
      ["liability", "₹0"],
    ]);
    expect(tiles[0].note).toBe("Starts counting when you activate");
  });

  test("a live programme gets six tiles with comparisons and money translations", () => {
    const tiles = buildMetricTiles({ ...base, programState: "live", dashboard });
    const byId = Object.fromEntries(tiles.map((tile) => [tile.id, tile]));

    expect(tiles).toHaveLength(6);
    expect(byId.revenue).toMatchObject({ value: "₹584,200", delta: "↑ 14%", deltaTone: "good" });
    expect(byId.liability).toMatchObject({
      value: "₹44,232",
      note: "184,300 unspent · expire after 12 months",
    });
    expect(byId.repeat).toMatchObject({ value: "62.0%", delta: "↑ 5 pts" });
    expect(byId.issued.note).toBe("≈ ₹14,976 of value handed out");
    expect(byId.redeemed.note).toBe("43 rewards handed over");
    expect(byId.redemption_rate).toMatchObject({ value: "34.5%", delta: "↑ 2.1 pts" });
  });

  test("a rate with nothing to compare against has no chip, and a null rate reads as a dash", () => {
    const tiles = buildMetricTiles({
      ...base,
      programState: "live",
      dashboard: {
        ...dashboard,
        metrics: {
          ...dashboard.metrics,
          redemptionRate: { current: null, previous: null, changePct: null },
          repeatVisitRate: {
            current: 50,
            previous: null,
            changePct: null,
            buyers: 2,
            repeaters: 1,
          },
        },
      },
    });
    const byId = Object.fromEntries(tiles.map((tile) => [tile.id, tile]));
    expect(byId.redemption_rate.value).toBe("—");
    expect(byId.repeat).toMatchObject({ value: "50.0%", delta: null });
  });

  test("without a dashboard a live programme has no tiles yet", () => {
    expect(buildMetricTiles({ ...base, programState: "live", dashboard: undefined })).toEqual([]);
  });
});
