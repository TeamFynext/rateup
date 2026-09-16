import { describe, expect, test } from "vitest";

import { buildStarterRewards } from "./starterRewards.ts";

const context = {
  averageOrderValue: 500,
  earnRate: { pointsPerUnit: 1, multiplier: 1 },
  currencyCode: "INR",
  currencySymbol: "₹",
};

describe("buildStarterRewards", () => {
  test("two for everyone and two VIP-only: a free item and a cash-off in each", () => {
    const rows = buildStarterRewards("cafe", context, "vip-1");
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.rewardValue.type)).toEqual([
      "free_item",
      "discount_fixed",
      "free_item",
      "discount_fixed",
    ]);
    expect(rows.map((r) => r.availableForTiers)).toEqual([[], [], ["vip-1"], ["vip-1"]]);
    expect(new Set(rows.map((r) => r.name)).size).toBe(4);
  });

  test("the VIP pair is worth more than the everyone pair", () => {
    const [baseFree, baseCash, vipFree, vipCash] = buildStarterRewards("cafe", context, "vip-1");
    expect(Number(vipFree.rewardValue.item_value)).toBeGreaterThan(
      Number(baseFree.rewardValue.item_value),
    );
    expect(Number(vipCash.rewardValue.amount)).toBeGreaterThan(Number(baseCash.rewardValue.amount));
    expect(Number(vipCash.pointsCost)).toBeGreaterThan(Number(baseCash.pointsCost));
  });

  test("without a VIP tier only the everyone pair is seeded", () => {
    const rows = buildStarterRewards("retail", context, undefined);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => (r.availableForTiers ?? []).length === 0)).toBe(true);
  });

  test("an unknown order value yields nothing rather than unpriced rows", () => {
    expect(buildStarterRewards("cafe", { ...context, averageOrderValue: null }, "vip-1")).toEqual(
      [],
    );
  });
});
