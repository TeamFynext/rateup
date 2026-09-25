import { describe, expect, test } from "vitest";

import type { LoyaltyPreset, OnboardingState } from "@/backend/loyalty/onboarding.api";

import {
  buildEarningDefaults,
  buildMessagesDefaults,
  buildProfileDefaults,
  buildRewardsDefaults,
  buildVipTierDefaults,
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
  tiers: [
    { name: "Bronze", threshold: 0, multiplier: 1, color: "#a00" },
    {
      name: "Gold",
      threshold: 3000,
      multiplier: 1.5,
      color: "#fc0",
      benefits_description: "Perks",
    },
  ],
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
    signupBonusEnabled: true,
    referralBonusEnabled: true,
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
  test("a fresh programme takes every value from the preset, and the org for the rest", () => {
    expect(
      buildProfileDefaults(empty, preset, { orgName: "Kettle & Co", email: "hi@kettle.co" }),
    ).toMatchObject({
      businessName: "Kettle & Co",
      name: "Kettle & Co Rewards",
      contactEmail: "hi@kettle.co",
      brandColor: "#1c518e",
      logoUrl: "",
    });
    expect(buildProfileDefaults(empty, preset).name).toBe("Cafe & Restaurant");
    expect(buildProfileDefaults(empty, preset).timezone).not.toBe("");
    expect(buildEarningDefaults(empty, preset)).toMatchObject({
      averageOrderValue: 240,
      currencyName: "Beans",
    });
    expect(buildEarningDefaults(empty, preset).rules).toHaveLength(2);
    expect(buildEarningDefaults(empty, preset).rules[1]).toMatchObject({
      multiplier: 2,
      allowedDays: ["sat", "sun"],
      status: "active",
    });
    expect(buildVipTierDefaults(empty, preset)).toEqual({
      tiersEnabled: true,
      qualificationWindowMonths: 12,
      base: { name: "Member", color: "#5a8cc6" },
      // The name is always "VIP" and the rate 1×; only the threshold and perks come from the
      // starter pack.
      upper: [
        {
          name: "VIP",
          color: "#f8951d",
          threshold: 3000,
          pointsMultiplier: 1,
          benefitsDescription: "Perks",
        },
      ],
    });
    expect(buildRewardsDefaults(empty, preset)).toMatchObject({
      // The join and referral bonuses are the rewards step's now, not basics'.
      signupBonus: 50,
      referralBonus: 100,
      refereeBonus: 50,
    });
    // Fresh rewards come from the starter catalog, not the preset: a free item and a
    // cash-off for everyone, and the same pair again for VIP when a VIP tier exists.
    const fresh = buildRewardsDefaults(empty, preset).rewards;
    expect(fresh).toHaveLength(2);
    expect(fresh[0]).toMatchObject({
      name: "Free size upgrade",
      stockQuantity: null,
      availableForTiers: [],
    });
    expect(fresh[1].rewardValue).toMatchObject({ type: "discount_fixed" });

    const withVip = buildRewardsDefaults(empty, preset, "vip-1").rewards;
    expect(withVip).toHaveLength(4);
    expect(withVip.slice(2).every((r) => r.availableForTiers?.[0] === "vip-1")).toBe(true);
  });

  test("saved rows beat the preset and keep their ids, so a save updates rather than forks", () => {
    expect(buildProfileDefaults(saved, preset, { orgName: "Ignored" })).toMatchObject({
      name: "Kettle & Co Rewards",
    });
    expect(buildEarningDefaults(saved, preset)).toMatchObject({ averageOrderValue: 300 });

    const rule = buildEarningDefaults(saved, preset).rules[0];
    expect(rule).toMatchObject({
      id: "r1",
      status: "inactive",
      pointsPerUnit: 1,
      bonusPoints: 0,
      minPurchaseAmount: 100,
      applicableToTiers: ["t1"],
    });

    // One saved tier above zero and none at zero: it is the VIP, and the base is fresh.
    expect(buildVipTierDefaults(saved, preset)).toEqual({
      tiersEnabled: false,
      qualificationWindowMonths: 12,
      base: { name: "Member", color: "#5a8cc6" },
      upper: [
        {
          id: "t1",
          name: "Gold",
          color: "#fc0",
          threshold: 5000,
          pointsMultiplier: 1.5,
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

  // Fresh rewards are starters priced at the earn rate in play: the cafe pack's cheapest free
  // item is a size upgrade worth a fifth of the ₹240 order (₹50), and at 0.1 points per
  // rupee that is 50 × 0.1 × 100 / 3 ≈ 160 points for ~3% back. A saved rate re-prices it.
  test("starter rewards are priced for the earn rate in play", () => {
    const atPresetRate = Number(buildRewardsDefaults(empty, preset).rewards[0].pointsCost);
    expect(atPresetRate).toBe(160);

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
    const atDoubleRate = Number(buildRewardsDefaults(doubled, preset).rewards[0].pointsCost);
    expect(atDoubleRate).toBeGreaterThan(atPresetRate * 1.6);
    expect(atDoubleRate).toBeLessThan(atPresetRate * 2.4);
  });

  test("starters use the saved order value and rate, not the preset's", () => {
    // Saved rate 0.1 and a ₹300 order value, no rewards yet: the upgrade is worth ₹60, so
    // 60 × 0.1 × 100 / 3 = 200.
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
    expect(buildRewardsDefaults(ruleOnly, preset).rewards[0].pointsCost).toBe(200);
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
