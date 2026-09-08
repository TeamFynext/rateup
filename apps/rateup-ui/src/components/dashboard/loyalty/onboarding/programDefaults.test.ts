import { describe, expect, test } from "vitest";

import type { LoyaltyPreset, OnboardingState } from "@/backend/loyalty/onboarding.api";

import {
  buildBasicsDefaults,
  buildEarningDefaults,
  buildMessagesDefaults,
  buildRewardsDefaults,
  buildTiersDefaults,
  normaliseRewardType,
  richTextToPlainText,
} from "./programDefaults";

const preset: LoyaltyPreset = {
  key: "cafe",
  label: "Cafe & Restaurant",
  description: "",
  matchIndustries: [],
  basics: {
    currencyName: "Beans",
    signupBonus: 50,
    referralBonus: 100,
    refereeBonus: 50,
    averageOrderValue: 240,
  },
  earningRules: [
    {
      name: "Standard",
      description: "Every purchase",
      pointsPerUnit: 0.1,
      isDefault: true,
      priority: 0,
    },
    {
      name: "Weekend",
      description: "",
      pointsPerUnit: 0.1,
      multiplier: 2,
      allowedDays: ["sat", "sun"],
      isDefault: false,
      priority: 1,
    },
  ],
  tiersEnabled: true,
  tiers: [{ name: "Bronze", threshold: 0, multiplier: 1, color: "#a00" }],
  rewards: [
    {
      name: "Free coffee",
      description: "",
      pointsCost: 500,
      rewardType: "point",
      rewardValue: { type: "free_item", item_name: "Coffee" },
    },
  ],
  commands: [
    { type: "PointInformation", requestMessage: "points", text: "You have {{1}} points." },
  ],
  eventTemplates: [
    { eventType: "POINTS_ISSUED", templateName: "loyalty_points", body: "Hi {{1}}", params: [] },
  ],
};

const empty: OnboardingState = {
  program: null,
  presetKey: null,
  lastCompletedStep: null,
  saved: { tiers: [], rules: [], rewards: [], commands: [], triggers: [] },
  counts: { tiers: 0, rules: 0, rewards: 0, commands: 0, triggers: 0 },
};

const saved: OnboardingState = {
  ...empty,
  program: {
    id: "p1",
    orgId: "o1",
    name: "Kettle & Co Rewards",
    status: "active",
    currencyName: "Beans",
    currencyCode: "INR",
    currencySymbol: "₹",
    signupBonus: 25,
    referralBonus: 0,
    refereeBonus: 0,
    tiersEnabled: false,
    averageOrderValue: 300,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  saved: {
    tiers: [
      {
        id: "t1",
        name: "Gold",
        threshold: "5000.00",
        pointsMultiplier: "1.50",
        color: "#fc0",
        benefitsDescription: null,
      },
    ],
    rules: [
      {
        id: "r1",
        name: "Standard",
        description: null,
        status: "inactive",
        pointsPerUnit: "1.00",
        multiplier: "1.00",
        bonusPoints: null,
        allowedDays: [],
        minPurchaseAmount: "100.00",
        applicableToTiers: ["t1"],
        isDefault: true,
        priority: 0,
      },
    ],
    rewards: [
      {
        id: "rw1",
        name: "Cake",
        description: null,
        pointsCost: 1200,
        rewardType: "COUPON_BLOB",
        rewardValue: { code: "X" },
        stockQuantity: 5,
        availableForTiers: ["t1"],
      },
    ],
    commands: [
      {
        type: "PointInformation",
        requestMessage: "bal",
        content: {
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Balance: {{1}}" }] }],
        },
      },
    ],
    triggers: [],
  },
};

describe("programDefaults", () => {
  test("a fresh programme takes every value from the preset", () => {
    expect(buildBasicsDefaults(empty, preset)).toMatchObject({
      name: "Cafe & Restaurant",
      currencyName: "Beans",
      averageOrderValue: 240,
    });
    expect(buildEarningDefaults(empty, preset).rules).toHaveLength(2);
    expect(buildEarningDefaults(empty, preset).rules[1]).toMatchObject({
      multiplier: 2,
      allowedDays: ["sat", "sun"],
      status: "active",
    });
    expect(buildTiersDefaults(empty, preset)).toEqual({
      tiersEnabled: true,
      tiers: [
        {
          name: "Bronze",
          threshold: 0,
          pointsMultiplier: 1,
          color: "#a00",
          benefitsDescription: "",
        },
      ],
    });
    expect(buildRewardsDefaults(empty, preset)).toMatchObject({
      // The join and referral bonuses are the rewards step's now, not basics'.
      signupBonus: 50,
      referralBonus: 100,
      refereeBonus: 50,
    });
    expect(buildRewardsDefaults(empty, preset).rewards[0]).toMatchObject({
      name: "Free coffee",
      stockQuantity: null,
      availableForTiers: [],
    });
  });

  test("saved rows beat the preset and keep their ids, so a save updates rather than forks", () => {
    expect(buildBasicsDefaults(saved, preset)).toMatchObject({
      name: "Kettle & Co Rewards",
      averageOrderValue: 300,
    });

    const rule = buildEarningDefaults(saved, preset).rules[0];
    expect(rule).toMatchObject({
      id: "r1",
      status: "inactive",
      pointsPerUnit: 1,
      bonusPoints: 0,
      minPurchaseAmount: 100,
      applicableToTiers: ["t1"],
    });

    expect(buildTiersDefaults(saved, preset)).toEqual({
      tiersEnabled: false,
      tiers: [
        {
          id: "t1",
          name: "Gold",
          threshold: 5000,
          pointsMultiplier: 1.5,
          color: "#fc0",
          benefitsDescription: "",
        },
      ],
    });

    expect(buildRewardsDefaults(saved, preset)).toMatchObject({
      signupBonus: 25,
      referralBonus: 0,
      refereeBonus: 0,
    });

    expect(buildRewardsDefaults(saved, preset).rewards[0]).toMatchObject({
      id: "rw1",
      rewardType: "point", // an unexpected stored type narrows back to the form's union
      stockQuantity: 5,
      availableForTiers: ["t1"],
    });
  });

  test("messages prefill each preset keyword from what was saved, flattening rich text", () => {
    const defaults = buildMessagesDefaults(saved, preset);

    expect(defaults.commands).toEqual([
      {
        type: "PointInformation",
        requestMessage: "bal",
        text: "Balance: {{1}}",
        waTemplateId: null,
      },
    ]);
    expect(defaults.eventTemplates[0]).toMatchObject({ eventType: "POINTS_ISSUED", enabled: true });
  });

  // Preset rewards ship priced for one point per currency unit. The fixture's preset earns
  // 0.1 per unit, so its Free coffee — item value unknown, hence unpriceable by worth — is
  // scaled to a tenth of the shipped cost; a saved rate re-prices it again.
  test("rewards from the preset are priced for the earn rate in play", () => {
    expect(buildRewardsDefaults(empty, preset).rewards[0].pointsCost).toBe(50);

    const doubled: OnboardingState = {
      ...empty,
      saved: {
        ...empty.saved,
        rules: [
          {
            id: "r1",
            name: "Standard",
            pointsPerUnit: "0.2",
            multiplier: "1",
            bonusPoints: 0,
            allowedDays: [],
            isDefault: true,
            priority: 0,
            status: "active",
          },
        ] as unknown as OnboardingState["saved"]["rules"],
      },
    };
    expect(buildRewardsDefaults(doubled, preset).rewards[0].pointsCost).toBe(100);
  });

  test("a priceable preset reward is priced to about 3% back at the saved rate", () => {
    const priced: LoyaltyPreset = {
      ...preset,
      rewards: [
        {
          ...preset.rewards[0],
          pointsCost: 5000,
          rewardValue: { type: "free_item", item_name: "Coffee", item_value: 150, quantity: 1 },
        },
      ],
    };
    // A programme with a saved rate of 0.1 and a ₹300 order value, but no rewards yet:
    // 150 × 0.1 × 100 / 3 = 500.
    const ruleOnly: OnboardingState = {
      ...saved,
      saved: {
        ...saved.saved,
        rewards: [],
        rules: [
          {
            id: "r1",
            name: "Standard",
            pointsPerUnit: "0.1",
            multiplier: "1",
            bonusPoints: 0,
            allowedDays: [],
            isDefault: true,
            priority: 0,
            status: "active",
          },
        ] as unknown as OnboardingState["saved"]["rules"],
      },
    };
    expect(buildRewardsDefaults(ruleOnly, priced).rewards[0].pointsCost).toBe(500);
  });

  test("saved rewards keep the cost the merchant gave them", () => {
    expect(buildRewardsDefaults(saved, preset).rewards[0].pointsCost).toBe(
      saved.saved.rewards[0].pointsCost,
    );
  });

  test("helpers", () => {
    expect(normaliseRewardType("coupon")).toBe("coupon");
    expect(normaliseRewardType("ASSIGNED")).toBe("point");
    expect(richTextToPlainText("plain")).toBe("plain");
    expect(
      richTextToPlainText({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Line one" }] },
          { type: "paragraph", content: [] },
          { type: "paragraph", content: [{ type: "text", text: "Line two" }] },
        ],
      }),
    ).toBe("Line one\nLine two");
  });
});
