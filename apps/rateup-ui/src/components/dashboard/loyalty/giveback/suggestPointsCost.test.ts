import { describe, expect, it } from "vitest";

import { rewardEconomics } from "./calculateGiveback";
import { roundNice, suggestPointsCost, TARGET_GIVEBACK_PCT } from "./suggestPointsCost";

const EARN = { pointsPerUnit: 1, multiplier: 1 };

describe("roundNice", () => {
  it.each([
    [0, 0],
    [-5, 0],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
    [0.4, 1], // clamped to 1 rather than rounding away to nothing
    [4.9, 5], // below 10 there is no second significant figure to keep
    [833, 830],
    [5000, 5000],
    [4983, 5000],
    [16667, 17000],
    [80000, 80000],
  ])("rounds %p to %p", (input, expected) => {
    expect(roundNice(input)).toBe(expected);
  });

  it("keeps two significant figures", () => {
    expect(roundNice(12345)).toBe(12000);
    expect(roundNice(98765)).toBe(99000);
  });
});

describe("suggestPointsCost", () => {
  it("prices a free item so it lands on the target", () => {
    const pointsCost = suggestPointsCost({
      rewardValue: { type: "free_item", item_name: "Coffee", item_value: 150, quantity: 1 },
      earnRate: EARN,
      averageOrderValue: 250,
    });
    expect(pointsCost).toBe(5000);
  });

  it("prices a percentage discount against the order value", () => {
    // 5% of a 500 order is 25; at 1 point per unit and a 3% target that is ~830 points.
    expect(
      suggestPointsCost({
        rewardValue: { type: "discount_percentage", percentage: 5, max_discount_amount: null },
        earnRate: EARN,
        averageOrderValue: 500,
      }),
    ).toBe(830);
  });

  it("scales with the earn rate — twice the points per unit, twice the price", () => {
    const base = { rewardValue: { type: "discount_fixed", amount: 100 }, averageOrderValue: 500 };
    const single = suggestPointsCost({ ...base, earnRate: EARN });
    const double = suggestPointsCost({ ...base, earnRate: { pointsPerUnit: 2, multiplier: 1 } });
    // Not exactly 2x: rounding to two significant figures happens after the scaling.
    expect(double).toBeGreaterThan((single ?? 0) * 1.9);
    expect(double).toBeLessThan((single ?? 0) * 2.1);
  });

  it("folds the rule multiplier in", () => {
    expect(
      suggestPointsCost({
        rewardValue: { type: "discount_fixed", amount: 100 },
        earnRate: { pointsPerUnit: 1, multiplier: 2 },
        averageOrderValue: 500,
      }),
    ).toBe(
      suggestPointsCost({
        rewardValue: { type: "discount_fixed", amount: 100 },
        earnRate: { pointsPerUnit: 2, multiplier: 1 },
        averageOrderValue: 500,
      }),
    );
  });

  it("honours an explicit target", () => {
    const at3 = suggestPointsCost({
      rewardValue: { type: "discount_fixed", amount: 150 },
      earnRate: EARN,
      averageOrderValue: 250,
    });
    const at6 = suggestPointsCost({
      rewardValue: { type: "discount_fixed", amount: 150 },
      earnRate: EARN,
      averageOrderValue: 250,
      targetGivebackPct: 6,
    });
    // A more generous target means a cheaper reward.
    expect(at6).toBeLessThan(at3 ?? 0);
  });

  it("reads dialect B, so a reward from the standalone editor prices too", () => {
    expect(
      suggestPointsCost({
        rewardValue: { rewardType: "free-item", estimatedValue: 150 },
        earnRate: EARN,
        averageOrderValue: 250,
      }),
    ).toBe(5000);
  });

  describe("returns null rather than inventing a number", () => {
    it("when a percentage reward has no order value to price against", () => {
      expect(
        suggestPointsCost({
          rewardValue: { type: "discount_percentage", percentage: 10, max_discount_amount: null },
          earnRate: EARN,
          averageOrderValue: null,
        }),
      ).toBeNull();
    });

    it.each([null, 0, -10])("when the order value is %p", (averageOrderValue) => {
      expect(
        suggestPointsCost({
          rewardValue: { type: "discount_percentage", percentage: 10, max_discount_amount: null },
          earnRate: EARN,
          averageOrderValue,
        }),
      ).toBeNull();
    });

    it("when nothing is earned per unit spent", () => {
      expect(
        suggestPointsCost({
          rewardValue: { type: "discount_fixed", amount: 100 },
          earnRate: { pointsPerUnit: 0, multiplier: 1 },
          averageOrderValue: 250,
        }),
      ).toBeNull();
    });

    it("when the reward carries no monetary worth", () => {
      expect(
        suggestPointsCost({
          rewardValue: { type: "free_item", item_name: "Tote" },
          earnRate: EARN,
          averageOrderValue: 250,
        }),
      ).toBeNull();
    });
  });
});

/**
 * The API's starter packs were hand-priced to ~3% before this function existed. Reproducing
 * them is the strongest evidence the formula is right, so they are the oracle — mirrored by
 * hand from `rateup-api/src/modules/loyalty/onboarding/presets.ts`.
 */
describe("reproduces the hand-tuned preset prices", () => {
  const PRESETS: ReadonlyArray<[string, number, string, unknown, number]> = [
    [
      "cafe",
      250,
      "Free Coffee",
      { type: "free_item", item_name: "Regular hot drink", item_value: 150, quantity: 1 },
      5000,
    ],
    [
      "cafe",
      250,
      "Free Pastry",
      { type: "free_item", item_name: "Pastry", item_value: 120, quantity: 1 },
      4000,
    ],
    [
      "cafe",
      250,
      "10% Off Your Bill",
      { type: "discount_percentage", percentage: 10, max_discount_amount: null },
      800,
    ],
    ["retail", 1200, "Cash Off Your Order", { type: "discount_fixed", amount: 500 }, 15000],
    [
      "retail",
      1200,
      "10% Off",
      { type: "discount_percentage", percentage: 10, max_discount_amount: null },
      4000,
    ],
    [
      "retail",
      1200,
      "20% Off",
      { type: "discount_percentage", percentage: 20, max_discount_amount: null },
      8000,
    ],
    [
      "salon",
      1500,
      "Complimentary Add-On",
      { type: "free_item", item_name: "Add-on treatment", item_value: 800, quantity: 1 },
      25000,
    ],
    [
      "salon",
      1500,
      "15% Off Any Service",
      { type: "discount_percentage", percentage: 15, max_discount_amount: null },
      7500,
    ],
    [
      "salon",
      1500,
      "Free Signature Treatment",
      { type: "free_item", item_name: "Signature treatment", item_value: 2500, quantity: 1 },
      80000,
    ],
    [
      "gym",
      2000,
      "Guest Day Pass",
      { type: "free_item", item_name: "Guest day pass", item_value: 500, quantity: 1 },
      16000,
    ],
    [
      "gym",
      2000,
      "Free Personal Training Session",
      { type: "free_item", item_name: "Personal training session", item_value: 1200, quantity: 1 },
      40000,
    ],
    [
      "gym",
      2000,
      "10% Off Membership Renewal",
      { type: "discount_percentage", percentage: 10, max_discount_amount: null },
      6500,
    ],
    [
      "generic",
      500,
      "5% Off",
      { type: "discount_percentage", percentage: 5, max_discount_amount: null },
      800,
    ],
    [
      "generic",
      500,
      "10% Off",
      { type: "discount_percentage", percentage: 10, max_discount_amount: null },
      1600,
    ],
    [
      "generic",
      500,
      "20% Off",
      { type: "discount_percentage", percentage: 20, max_discount_amount: null },
      3200,
    ],
  ];

  it.each(PRESETS)("%s / %s: %s", (_preset, averageOrderValue, _name, rewardValue, shipped) => {
    const suggested = suggestPointsCost({ rewardValue, earnRate: EARN, averageOrderValue });
    expect(suggested).not.toBeNull();
    // Within 15% of the shipped figure: both are round numbers aiming at the same 3%.
    expect(Math.abs((suggested ?? 0) - shipped) / shipped).toBeLessThanOrEqual(0.15);
  });

  it.each(PRESETS)(
    "%s / %s: %s lands in the healthy band",
    (_p, averageOrderValue, _n, rewardValue) => {
      const pointsCost = suggestPointsCost({ rewardValue, earnRate: EARN, averageOrderValue });
      const economics = rewardEconomics({
        rewardValue,
        pointsCost: pointsCost ?? 0,
        earnRate: EARN,
        averageOrderValue,
      });

      expect(economics.band).toBe("healthy");
      expect(economics.givebackPct).toBeGreaterThan(TARGET_GIVEBACK_PCT * 0.9);
      expect(economics.givebackPct).toBeLessThan(TARGET_GIVEBACK_PCT * 1.1);
    },
  );
});
