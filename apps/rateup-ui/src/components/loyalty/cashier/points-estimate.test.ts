import { describe, expect, test } from "vitest";

import type { LoyaltyEarningRule } from "@/backend/loyalty/earningRules.api";

import { estimateEarn } from "./points-estimate";

const standard: LoyaltyEarningRule = {
  id: "std",
  name: "Standard",
  pointsPerUnit: 0.1,
  multiplier: 1,
  bonusPoints: 0,
  isDefault: true,
  priority: 0,
  status: "active",
};
const happyHour: LoyaltyEarningRule = {
  id: "hh",
  name: "Happy hour",
  pointsPerUnit: 0.1,
  multiplier: 2,
  bonusPoints: 0,
  isDefault: false,
  priority: 5,
  status: "active",
  allowedDays: ["mon", "tue", "wed", "thu", "fri"],
  allowedTimeRanges: [{ start: "15:00", end: "18:00" }],
};
const monsoon: LoyaltyEarningRule = {
  id: "mo",
  name: "Monsoon",
  pointsPerUnit: 0.1,
  multiplier: 1,
  bonusPoints: 100,
  isDefault: false,
  priority: 3,
  status: "active",
  validUntil: "2026-09-30T23:59:59Z",
};
const big: LoyaltyEarningRule = {
  id: "big",
  name: "Big spender",
  pointsPerUnit: 0.2,
  multiplier: 1,
  bonusPoints: 0,
  isDefault: false,
  priority: 9,
  status: "active",
  minPurchaseAmount: 1000,
};

// Wednesday 16:30 local.
const wednesdayAfternoon = new Date(2026, 8, 9, 16, 30);
// Saturday 10:00 local.
const saturdayMorning = new Date(2026, 8, 12, 10, 0);

describe("estimateEarn", () => {
  test("the default rule prices a plain purchase, floored", () => {
    const e = estimateEarn({
      amount: 345,
      rules: [standard],
      tier: null,
      tiersEnabled: false,
      now: saturdayMorning,
    });
    expect(e).toMatchObject({ points: 34, basePoints: 34, tierMultiplier: 1 });
    expect(e?.rule.id).toBe("std");
  });

  test("the highest-priority matching extra rule wins, tier multiplier applied after", () => {
    const e = estimateEarn({
      amount: 340,
      rules: [standard, happyHour, monsoon],
      tier: { pointsMultiplier: "1.25" },
      tiersEnabled: true,
      now: wednesdayAfternoon,
    });
    // 340 × 0.1 × 2 = 68, × 1.25 = 85
    expect(e).toMatchObject({ points: 85, tierMultiplier: 1.25 });
    expect(e?.rule.id).toBe("hh");
  });

  test("a rule outside its days or window steps aside for the next", () => {
    const e = estimateEarn({
      amount: 340,
      rules: [standard, happyHour, monsoon],
      tier: null,
      tiersEnabled: false,
      now: saturdayMorning,
    });
    // Monsoon: 34 + 100 flat
    expect(e?.rule.id).toBe("mo");
    expect(e?.points).toBe(134);
  });

  test("an expired rule and an unmet minimum are skipped", () => {
    const after = new Date(2026, 9, 5, 10, 0);
    expect(
      estimateEarn({
        amount: 340,
        rules: [standard, monsoon, big],
        tier: null,
        tiersEnabled: false,
        now: after,
      })?.rule.id,
    ).toBe("std");
    expect(
      estimateEarn({
        amount: 1200,
        rules: [standard, big],
        tier: null,
        tiersEnabled: false,
        now: after,
      }),
    ).toMatchObject({ points: 240 });
  });

  test("tiers switched off means no tier multiplier", () => {
    const e = estimateEarn({
      amount: 100,
      rules: [standard],
      tier: { pointsMultiplier: 2 },
      tiersEnabled: false,
    });
    expect(e?.points).toBe(10);
  });

  test("a rule restricted to another tier is skipped", () => {
    const gold: LoyaltyEarningRule = {
      ...happyHour,
      id: "gold",
      allowedDays: [],
      allowedTimeRanges: [],
      applicableToTiers: ["tier-gold"],
    };
    expect(
      estimateEarn({
        amount: 100,
        rules: [standard, gold],
        tier: null,
        tiersEnabled: true,
        tierId: "tier-bronze",
      })?.rule.id,
    ).toBe("std");
    expect(
      estimateEarn({
        amount: 100,
        rules: [standard, gold],
        tier: null,
        tiersEnabled: true,
        tierId: "tier-gold",
      })?.rule.id,
    ).toBe("gold");
  });

  test("nothing to estimate without an amount or an active rule", () => {
    expect(
      estimateEarn({ amount: 0, rules: [standard], tier: null, tiersEnabled: false }),
    ).toBeNull();
    expect(
      estimateEarn({
        amount: 100,
        rules: [{ ...standard, status: "inactive" }],
        tier: null,
        tiersEnabled: false,
      }),
    ).toBeNull();
  });
});
