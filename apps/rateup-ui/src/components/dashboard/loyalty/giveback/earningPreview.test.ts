import { describe, expect, test } from "vitest";

import { pointsEarned, previewAmounts, tierPreviewRows } from "./earningPreview";

const RATE = { pointsPerUnit: 0.1, multiplier: 1, bonusPoints: 0 };

describe("pointsEarned", () => {
  test("multiplies, adds the flat bonus, applies the tier and floors", () => {
    expect(pointsEarned(250, RATE)).toBe(25);
    expect(pointsEarned(249, RATE)).toBe(24);
    expect(pointsEarned(250, { ...RATE, bonusPoints: 5 })).toBe(30);
    expect(pointsEarned(250, { ...RATE, multiplier: 2 })).toBe(50);
    expect(pointsEarned(250, RATE, 1.5)).toBe(37);
  });

  test("never goes negative or NaN", () => {
    expect(pointsEarned(Number.NaN, RATE)).toBe(0);
    expect(pointsEarned(100, { pointsPerUnit: 0, multiplier: 1, bonusPoints: 0 })).toBe(0);
  });
});

describe("previewAmounts", () => {
  test("half, the order, double — rounded nicely and ascending", () => {
    expect(previewAmounts(250)).toEqual([130, 250, 500]);
    expect(previewAmounts(1200)).toEqual([600, 1200, 2400]);
  });

  test("collapses duplicates for tiny orders", () => {
    expect(previewAmounts(1)).toEqual([1, 2]);
  });
});

describe("tierPreviewRows", () => {
  test("orders by threshold and applies each multiplier", () => {
    const rows = tierPreviewRows(250, RATE, [
      { name: "Gold", threshold: 5000, pointsMultiplier: 1.5, color: "#fc0" },
      { name: "Bronze", threshold: 0, pointsMultiplier: 1, color: null },
    ]);
    expect(rows.map((r) => [r.name, r.points])).toEqual([
      ["Bronze", 25],
      ["Gold", 37],
    ]);
  });
});
