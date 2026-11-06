import { describe, expect, it } from "vitest";

import {
  calculateGiveback,
  givebackBand,
  rewardEconomics,
  rewardWorth,
  toFiniteNumber,
  type GivebackInput,
} from "./giveback.js";
import { LOYALTY_PRESETS } from "./onboarding/presets.js";

/**
 * This table is mirrored, by hand, in
 * rateup-ui/src/components/dashboard/loyalty/giveback/calculateGiveback.test.ts.
 * The wizard computes giveback live and the server repeats it at activation; if the two
 * drift, a merchant sees one number while typing and a different one in the warning.
 */

const NO_TIERS = { tiersEnabled: false, tiers: [] };
const NO_BONUSES = { bonuses: { signupBonus: 0, referralBonus: 0, refereeBonus: 0 } };

function input(overrides: Partial<GivebackInput>): GivebackInput {
  return {
    earnRate: { pointsPerUnit: 1, multiplier: 1, bonusPoints: 0 },
    rewards: [],
    averageOrderValue: 250,
    ...NO_TIERS,
    ...NO_BONUSES,
    ...overrides,
  };
}

describe("toFiniteNumber", () => {
  it.each([
    ["7", 7],
    [7, 7],
    ["", 0],
    [null, 0],
    [undefined, 0],
    ["abc", 0],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
    [-5, 0], // a negative earn rate or reward value has no meaning
  ])("coerces %p to %p", (raw, expected) => {
    expect(toFiniteNumber(raw)).toBe(expected);
  });

  it("uses the fallback only for absent values, not for zero", () => {
    expect(toFiniteNumber(undefined, 1)).toBe(1);
    expect(toFiniteNumber(0, 1)).toBe(0);
  });
});

describe("givebackBand", () => {
  it.each([
    [null, "unknown"],
    [0.4, "low"],
    [1, "healthy"],
    [5, "healthy"],
    [5.1, "generous"],
    [10, "generous"],
    [10.1, "excessive"],
    [150, "excessive"],
  ])("%p is %s", (pct, band) => {
    expect(givebackBand(pct)).toBe(band);
  });
});

describe("rewardWorth — dialect A (presets, wizard, reward.schema.ts)", () => {
  it("prices a fixed discount without needing an AOV", () => {
    expect(rewardWorth({ type: "discount_fixed", amount: 50 }, null)).toEqual({
      worth: 50,
      dependsOnAov: false,
    });
  });

  it("prices a percentage discount against the AOV", () => {
    expect(rewardWorth({ type: "discount_percentage", percentage: 10 }, 250)).toEqual({
      worth: 25,
      dependsOnAov: true,
    });
  });

  it("applies max_discount_amount as a cap, and treats null as uncapped", () => {
    expect(
      rewardWorth({ type: "discount_percentage", percentage: 50, max_discount_amount: 100 }, 1000),
    ).toEqual({ worth: 100, dependsOnAov: true });
    expect(
      rewardWorth({ type: "discount_percentage", percentage: 50, max_discount_amount: null }, 1000),
    ).toEqual({ worth: 500, dependsOnAov: true });
  });

  it("cannot price a percentage discount with no AOV", () => {
    expect(rewardWorth({ type: "discount_percentage", percentage: 10 }, null)).toEqual({
      worth: null,
      reason: "no_monetary_value",
    });
  });

  it("multiplies a free item by its quantity, defaulting to 1", () => {
    expect(
      rewardWorth({ type: "free_item", item_name: "Coffee", item_value: 150, quantity: 2 }, null),
    ).toEqual({ worth: 300, dependsOnAov: false });
    expect(rewardWorth({ type: "free_item", item_name: "Coffee", item_value: 150 }, null)).toEqual({
      worth: 150,
      dependsOnAov: false,
    });
  });

  it("skips a free item with no value set", () => {
    expect(rewardWorth({ type: "free_item", item_name: "Coffee", quantity: 1 }, 250)).toEqual({
      worth: null,
      reason: "no_monetary_value",
    });
  });
});

describe("rewardWorth — dialect B (the standalone rewards editor)", () => {
  it("prices fixed cashback", () => {
    expect(rewardWorth({ rewardType: "fixed-discount", cashbackAmount: 10 }, null)).toEqual({
      worth: 10,
      dependsOnAov: false,
    });
  });

  it("prices a percentage discount against the AOV", () => {
    expect(rewardWorth({ rewardType: "percentage-discount", discountPercentage: 5 }, 250)).toEqual({
      worth: 12.5,
      dependsOnAov: true,
    });
  });

  it.each(["free-item", "free-service"])("prices %s from estimatedValue", (rewardType) => {
    expect(rewardWorth({ rewardType, estimatedValue: 200 }, null)).toEqual({
      worth: 200,
      dependsOnAov: false,
    });
  });
});

describe("rewardWorth — unrecognised shapes", () => {
  it.each([null, undefined, "nope", 42, [], {}])("rejects %p", (value) => {
    expect(rewardWorth(value, 250)).toEqual({ worth: null, reason: "unrecognised_shape" });
  });

  it("falls back to sniffing an amount when the discriminator was never written", () => {
    expect(rewardWorth({ cashbackAmount: 25 }, null)).toEqual({ worth: 25, dependsOnAov: false });
    expect(rewardWorth({ discountPercentage: 20 }, 500)).toEqual({
      worth: 100,
      dependsOnAov: true,
    });
  });

  it("prices a coupon blob from discountType/discountValue", () => {
    expect(rewardWorth({ discountType: "fixed", discountValue: 75 }, null)).toEqual({
      worth: 75,
      dependsOnAov: false,
    });
    expect(rewardWorth({ discountType: "percentage", discountValue: 10 }, 300)).toEqual({
      worth: 30,
      dependsOnAov: true,
    });
  });
});

describe("rewardEconomics", () => {
  const earnRate = { pointsPerUnit: 1, multiplier: 1 };

  it("answers the motivating case: 5% off for 100 points", () => {
    const result = rewardEconomics({
      rewardValue: { rewardType: "percentage-discount", discountPercentage: 5 },
      pointsCost: 100,
      earnRate,
      averageOrderValue: 250,
    });
    expect(result.worth).toBe(12.5);
    expect(result.spendToEarn).toBe(100);
    expect(result.givebackPct).toBe(12.5);
    expect(result.band).toBe("excessive");
  });

  it("never divides by a zero points cost — coupons and assigned gifts are skipped", () => {
    const result = rewardEconomics({
      rewardValue: { rewardType: "fixed-discount", cashbackAmount: 10 },
      pointsCost: 0,
      earnRate,
      averageOrderValue: 250,
    });
    expect(result.skipReason).toBe("no_points_cost");
    expect(result.givebackPct).toBeNull();
    expect(result.spendToEarn).toBeNull();
  });

  it("reports worth but no spend or percentage when the earn rate is zero", () => {
    const result = rewardEconomics({
      rewardValue: { type: "discount_fixed", amount: 50 },
      pointsCost: 100,
      earnRate: { pointsPerUnit: 0, multiplier: 1 },
      averageOrderValue: 250,
    });
    expect(result.worth).toBe(50);
    expect(result.spendToEarn).toBeNull();
    expect(result.givebackPct).toBeNull();
  });

  it("folds the rule multiplier into the spend needed", () => {
    const result = rewardEconomics({
      rewardValue: { type: "discount_fixed", amount: 50 },
      pointsCost: 1000,
      earnRate: { pointsPerUnit: 1, multiplier: 2 },
      averageOrderValue: 250,
    });
    expect(result.spendToEarn).toBe(500);
    expect(result.givebackPct).toBe(10);
  });

  it("cannot price a percentage reward with no AOV", () => {
    const result = rewardEconomics({
      rewardValue: { type: "discount_percentage", percentage: 10 },
      pointsCost: 100,
      earnRate,
      averageOrderValue: null,
    });
    expect(result.skipReason).toBe("no_monetary_value");
    expect(result.worth).toBeNull();
  });
});

describe("calculateGiveback", () => {
  const coffee = {
    name: "Free Coffee",
    pointsCost: 3000,
    rewardValue: { type: "free_item", item_name: "Coffee", item_value: 150 },
  };

  it("computes the headline from the best-value reward", () => {
    const result = calculateGiveback(
      input({
        rewards: [
          coffee, // 0.05 per point
          {
            name: "Fiver off",
            pointsCost: 1000,
            rewardValue: { type: "discount_fixed", amount: 10 },
          }, // 0.01
        ],
      }),
    );
    expect(result.status).toBe("ok");
    expect(result.pointValue).toEqual({ best: 0.05, worst: 0.01 });
    expect(result.bestReward?.name).toBe("Free Coffee");
    expect(result.givebackPct).toBeCloseTo(5, 5);
    expect(result.givebackPctFloor).toBeCloseTo(1, 5);
    expect(result.band).toBe("healthy");
  });

  it("returns no_valued_rewards when the catalog is empty", () => {
    const result = calculateGiveback(input({ rewards: [] }));
    expect(result.status).toBe("no_valued_rewards");
    expect(result.givebackPct).toBeNull();
  });

  it("returns no_valued_rewards but explains each skip", () => {
    const result = calculateGiveback(
      input({
        rewards: [
          {
            name: "Coupon",
            pointsCost: 0,
            rewardValue: { discountType: "fixed", discountValue: 10 },
          },
          {
            name: "Mystery gift",
            pointsCost: 500,
            rewardValue: { type: "free_item", item_name: "Tote" },
          },
        ],
      }),
    );
    expect(result.status).toBe("no_valued_rewards");
    expect(result.skippedRewards).toEqual([
      { name: "Coupon", reason: "no_points_cost" },
      { name: "Mystery gift", reason: "no_monetary_value" },
    ]);
  });

  it("says the AOV is missing when that is what blocks pricing", () => {
    const result = calculateGiveback(
      input({
        averageOrderValue: null,
        rewards: [
          {
            name: "10% off",
            pointsCost: 500,
            rewardValue: { type: "discount_percentage", percentage: 10 },
          },
        ],
      }),
    );
    expect(result.status).toBe("needs_average_order_value");
  });

  it("reports no_earning when nothing is awarded on spend or per transaction", () => {
    const result = calculateGiveback(
      input({
        earnRate: { pointsPerUnit: 0, multiplier: 1, bonusPoints: 0 },
        rewards: [coffee],
      }),
    );
    expect(result.status).toBe("no_earning");
    expect(result.givebackPct).toBe(0);
  });

  it("attributes the whole giveback to the flat bonus when nothing is earned on spend", () => {
    const result = calculateGiveback(
      input({
        earnRate: { pointsPerUnit: 0, multiplier: 1, bonusPoints: 10 },
        averageOrderValue: 250,
        rewards: [
          {
            name: "Fiver off",
            pointsCost: 100,
            rewardValue: { type: "discount_fixed", amount: 10 },
          },
        ],
      }),
    );
    expect(result.status).toBe("ok");
    expect(result.givebackPct).toBeCloseTo(result.flatBonusPct ?? 0, 10);
    expect(result.givebackPct).toBeCloseTo(0.4, 5); // 10 pts × 0.1 / 250
  });

  it("prices without an AOV when nothing depends on it", () => {
    const result = calculateGiveback(
      input({
        averageOrderValue: null,
        rewards: [coffee],
      }),
    );
    expect(result.status).toBe("ok");
    expect(result.pointsPerOrder).toBeNull();
    expect(result.givebackPct).toBeCloseTo(5, 5);
  });

  it("scales each tier by its own multiplier and assumes no customer distribution", () => {
    const result = calculateGiveback(
      input({
        rewards: [coffee],
        tiersEnabled: true,
        tiers: [
          { name: "Silver", threshold: 0, pointsMultiplier: 1 },
          { name: "Gold", threshold: 10000, pointsMultiplier: 1.5 },
        ],
      }),
    );
    expect(result.perTier.map((t) => [t.name, Number(t.givebackPct.toFixed(4))])).toEqual([
      ["Silver", 5],
      ["Gold", 7.5],
    ]);
  });

  it("drops the tier table when tiers are off", () => {
    const result = calculateGiveback(
      input({
        rewards: [coffee],
        tiersEnabled: false,
        tiers: [{ name: "Silver", threshold: 0, pointsMultiplier: 1 }],
      }),
    );
    expect(result.perTier).toEqual([]);
  });

  it("bands the programme at its most generous tier, not at the base rate", () => {
    const result = calculateGiveback(
      input({
        rewards: [coffee],
        tiersEnabled: true,
        tiers: [
          { name: "Silver", threshold: 0, pointsMultiplier: 1 },
          { name: "Gold", threshold: 10000, pointsMultiplier: 1.5 },
        ],
      }),
    );
    // The base rate alone is 5% — "healthy". Gold earns at 1.5x, so the programme really
    // costs 7.5% for the customers it costs most, and that is what gets judged.
    expect(result.givebackPct).toBeCloseTo(5, 5);
    expect(result.givebackPctTop).toBeCloseTo(7.5, 5);
    expect(result.topTier?.name).toBe("Gold");
    expect(result.band).toBe("generous");
  });

  it("picks the top tier by multiplier, not by threshold", () => {
    const result = calculateGiveback(
      input({
        rewards: [coffee],
        tiersEnabled: true,
        tiers: [
          { name: "Silver", threshold: 0, pointsMultiplier: 1 },
          { name: "Founder", threshold: 500, pointsMultiplier: 3 },
          { name: "Gold", threshold: 10000, pointsMultiplier: 1.5 },
        ],
      }),
    );
    expect(result.topTier?.name).toBe("Founder");
    expect(result.givebackPctTop).toBeCloseTo(15, 5);
    expect(result.band).toBe("excessive");
  });

  it("reports a single tier, so a one-tier programme is not silently unpriced", () => {
    const result = calculateGiveback(
      input({
        rewards: [coffee],
        tiersEnabled: true,
        tiers: [{ name: "Members", threshold: 0, pointsMultiplier: 2 }],
      }),
    );
    expect(result.perTier).toHaveLength(1);
    expect(result.topTier?.name).toBe("Members");
    expect(result.givebackPctTop).toBeCloseTo(10, 5);
  });

  it("leaves the headline and the band alone when tiers are off", () => {
    const result = calculateGiveback(
      input({
        rewards: [coffee],
        tiersEnabled: false,
        tiers: [{ name: "Gold", threshold: 0, pointsMultiplier: 5 }],
      }),
    );
    expect(result.topTier).toBeNull();
    expect(result.givebackPctTop).toBe(result.givebackPct);
    expect(result.band).toBe("healthy");
  });

  it("keeps one-time bonuses out of the percentage and reports them as cash", () => {
    const result = calculateGiveback(
      input({
        rewards: [coffee],
        bonuses: { signupBonus: 100, referralBonus: 200, refereeBonus: 100 },
      }),
    );
    expect(result.givebackPct).toBeCloseTo(5, 5); // unchanged by the bonuses
    expect(result.oneTimeCosts).toEqual({ perNewMember: 5, perReferralPair: 15 });
  });

  it("survives Decimal-as-string and junk input without producing Infinity or NaN", () => {
    const result = calculateGiveback(
      input({
        earnRate: {
          pointsPerUnit: "1.00" as unknown as number,
          multiplier: "1.00" as unknown as number,
          bonusPoints: "" as unknown as number,
        },
        rewards: [
          {
            name: "Coffee",
            pointsCost: "3000" as unknown as number,
            rewardValue: { type: "free_item", item_value: "150" },
          },
        ],
      }),
    );
    expect(result.status).toBe("ok");
    expect(Number.isFinite(result.givebackPct ?? Number.NaN)).toBe(true);
    expect(result.givebackPct).toBeCloseTo(5, 5);
  });
});

describe("the shipped presets", () => {
  it.each(Object.values(LOYALTY_PRESETS).map((p) => [p.key, p] as const))(
    "%s prices every reward, earns healthily at base, and never gets past generous at its top tier",
    (_key, preset) => {
      const rule = preset.earningRules.find((r) => r.isDefault) ?? preset.earningRules[0];
      const result = calculateGiveback({
        earnRate: {
          pointsPerUnit: rule.pointsPerUnit,
          multiplier: rule.multiplier ?? 1,
          bonusPoints: rule.bonusPoints ?? 0,
        },
        rewards: preset.rewards.map((r) => ({
          name: r.name,
          pointsCost: r.pointsCost,
          rewardValue: r.rewardValue,
        })),
        averageOrderValue: preset.basics.averageOrderValue,
        tiersEnabled: preset.tiersEnabled,
        tiers: preset.tiers.map((t) => ({
          name: t.name,
          threshold: t.threshold,
          pointsMultiplier: t.multiplier,
        })),
        bonuses: {
          signupBonus: preset.basics.signupBonus,
          referralBonus: preset.basics.referralBonus,
          refereeBonus: preset.basics.refereeBonus,
        },
      });

      expect(result.skippedRewards).toEqual([]);

      // The base rate is the number every member earns at, and it must sit in the healthy
      // band. `band` itself is judged at the top tier, where a deliberately generous
      // multiplier is the point — so the guarantee there is only that no preset ships a
      // tier extravagant enough to be "excessive".
      expect(givebackBand(result.givebackPct)).toBe("healthy");
      expect(result.band).not.toBe("excessive");
    },
  );
});
