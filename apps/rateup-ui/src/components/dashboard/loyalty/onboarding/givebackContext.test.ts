import { describe, expect, test } from "vitest";

import type { LoyaltyPreset, OnboardingState } from "@/backend/loyalty/onboarding.api";

import { averageOrderValueOf, buildGivebackContext, defaultEarnRate } from "./givebackContext";

const preset: LoyaltyPreset = {
  key: "cafe",
  label: "Cafe",
  description: "",
  matchIndustries: [],
  basics: {
    currencyName: "Beans",
    signupBonus: 50,
    referralBonus: 100,
    refereeBonus: 50,
    averageOrderValue: 250,
  },
  earningRules: [
    { name: "Standard", description: "", pointsPerUnit: 1, isDefault: true, priority: 0 },
    {
      name: "Weekend",
      description: "",
      pointsPerUnit: 1,
      multiplier: 2,
      isDefault: false,
      priority: 1,
    },
  ],
  tiersEnabled: true,
  tiers: [{ name: "Bronze", threshold: 0, multiplier: 1, color: "#a00" }],
  rewards: [
    {
      name: "Free Coffee",
      description: "",
      pointsCost: 5000,
      rewardType: "point",
      rewardValue: { type: "free_item", item_name: "Coffee", item_value: 150, quantity: 1 },
    },
  ],
  commands: [],
  eventTemplates: [],
};

const empty: OnboardingState = {
  program: null,
  presetKey: null,
  lastCompletedStep: null,
  saved: { tiers: [], rules: [], rewards: [], commands: [], triggers: [] },
  counts: { tiers: 0, rules: 0, rewards: 0, commands: 0, triggers: 0 },
};

const withRule: OnboardingState = {
  ...empty,
  program: {
    id: "p1",
    orgId: "o1",
    name: "Kettle",
    status: "draft",
    currencyName: "Beans",
    currencyCode: "INR",
    currencySymbol: "₹",
    signupBonus: 0,
    referralBonus: 0,
    refereeBonus: 0,
    tiersEnabled: false,
    averageOrderValue: "300.00" as unknown as number,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  saved: {
    ...empty.saved,
    rules: [
      {
        id: "r2",
        name: "Weekend",
        pointsPerUnit: "0.2",
        multiplier: "2",
        bonusPoints: 0,
        allowedDays: ["sat"],
        isDefault: false,
        priority: 1,
        status: "active",
      },
      {
        id: "r1",
        name: "Standard",
        pointsPerUnit: "0.1",
        multiplier: "1",
        bonusPoints: 5,
        allowedDays: [],
        isDefault: true,
        priority: 0,
        status: "active",
      },
    ] as unknown as OnboardingState["saved"]["rules"],
  },
};

describe("defaultEarnRate", () => {
  test("falls back to the preset's default rule", () => {
    expect(defaultEarnRate(empty, preset)).toEqual({
      pointsPerUnit: 1,
      multiplier: 1,
      bonusPoints: 0,
    });
  });

  test("prefers the saved default rule, coerced from decimal strings", () => {
    expect(defaultEarnRate(withRule, preset)).toEqual({
      pointsPerUnit: 0.1,
      multiplier: 1,
      bonusPoints: 5,
    });
  });
});

describe("averageOrderValueOf", () => {
  test("null until the merchant says, a number once they have", () => {
    expect(averageOrderValueOf(empty)).toBeNull();
    expect(averageOrderValueOf(withRule)).toBe(300);
  });
});

describe("buildGivebackContext", () => {
  // The giveback is points valued at the best reward; before the merchant has chosen any,
  // there is nothing honest to compute — the preset's rewards must not stand in.
  test("carries no rewards until some are saved", () => {
    expect(buildGivebackContext(empty, preset).rewards).toEqual([]);
  });

  test("passes saved rewards through", () => {
    const state: OnboardingState = {
      ...withRule,
      saved: {
        ...withRule.saved,
        rewards: [
          {
            id: "rw1",
            name: "Coffee",
            description: null,
            pointsCost: 500,
            rewardType: "point",
            rewardValue: { type: "free_item", item_name: "Coffee", item_value: 150 },
          },
        ] as unknown as OnboardingState["saved"]["rewards"],
      },
    };
    expect(buildGivebackContext(state, preset).rewards).toEqual([
      {
        name: "Coffee",
        pointsCost: 500,
        rewardValue: { type: "free_item", item_name: "Coffee", item_value: 150 },
      },
    ]);
  });

  test("still falls back to the preset for the rate and the tiers", () => {
    const context = buildGivebackContext(empty, preset);
    expect(context.earnRate.pointsPerUnit).toBe(1);
    expect(context.tiers.map((tier) => tier.name)).toEqual(["Bronze"]);
    expect(context.averageOrderValue).toBeNull();
  });
});
