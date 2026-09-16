import { describe, expect, test } from "vitest";

import { pricePresetReward } from "./pricePresetReward";

const COFFEE = {
  pointsCost: 5000,
  rewardValue: { type: "free_item", item_name: "Regular hot drink", item_value: 150, quantity: 1 },
};
const TEN_OFF = {
  pointsCost: 800,
  rewardValue: { type: "discount_percentage", percentage: 10, max_discount_amount: null },
};

describe("pricePresetReward", () => {
  // The shipped cafe prices are 5000 and 800; the 3% rule lands on 5000 and 830 — the same
  // 15% tolerance suggestPointsCost.test.ts allows for every preset.
  test("at one point per unit the shipped price comes back", () => {
    expect(pricePresetReward(COFFEE, { pointsPerUnit: 1, multiplier: 1 }, 250)).toBe(5000);
    expect(pricePresetReward(TEN_OFF, { pointsPerUnit: 1, multiplier: 1 }, 250)).toBe(830);
  });

  test("a tenth of the rate is a tenth of the price", () => {
    expect(pricePresetReward(COFFEE, { pointsPerUnit: 0.1, multiplier: 1 }, 250)).toBe(500);
    expect(pricePresetReward(TEN_OFF, { pointsPerUnit: 0.1, multiplier: 1 }, 250)).toBe(83);
  });

  test("the default rule's multiplier is part of the rate", () => {
    expect(pricePresetReward(COFFEE, { pointsPerUnit: 0.5, multiplier: 2 }, 250)).toBe(5000);
  });

  test("a percentage reward without a typical order value is scaled from the shipped price", () => {
    expect(pricePresetReward(TEN_OFF, { pointsPerUnit: 0.1, multiplier: 1 }, null)).toBe(80);
    expect(pricePresetReward(TEN_OFF, { pointsPerUnit: 2, multiplier: 1 }, null)).toBe(1600);
  });

  test("a rate of nothing leaves the shipped price alone", () => {
    expect(pricePresetReward(COFFEE, { pointsPerUnit: 0, multiplier: 1 }, 250)).toBe(5000);
  });

  test("never prices a reward below one point", () => {
    expect(pricePresetReward(TEN_OFF, { pointsPerUnit: 0.0001, multiplier: 1 }, null)).toBe(1);
  });
});
