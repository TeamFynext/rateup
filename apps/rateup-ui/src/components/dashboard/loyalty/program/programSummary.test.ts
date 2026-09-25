import type { TFunction } from "i18next";
import { describe, expect, test } from "vitest";

import type { LoyaltyDashboardStats } from "@/backend/loyalty/dashboard/dashboard.query";
import type { OnboardingState } from "@/backend/loyalty/onboarding.api";

import type { GivebackResult } from "../giveback/calculateGiveback";
import { buildSectionSummaries } from "./programSummary";

/** Interpolates like i18next would, without loading it. */
const t = ((key: string, opts?: Record<string, unknown>) =>
  key.replace(/\{(\w+)\}/g, (_m, name: string) =>
    String(opts?.[name] ?? ""),
  )) as unknown as TFunction;

const giveback = {
  status: "ok",
  band: "healthy",
  pointsPerCurrencyUnit: 0.1,
  pointsPerOrder: 24,
  pointValue: { best: 0.24, worst: 0.2 },
  bestReward: null,
  valuedRewards: [],
  skippedRewards: [],
  givebackPct: 2.4,
  givebackPctFloor: 2,
  flatBonusPct: 0,
  givebackPctTop: 3.6,
  topTier: null,
  perTier: [],
  oneTimeCosts: null,
} satisfies GivebackResult;

const state: OnboardingState = {
  presetKey: "cafe",
  lastCompletedStep: "messages",
  program: {
    id: "p",
    orgId: "o",
    name: "Kettle & Co Rewards",
    status: "active",
    currencyName: "Beans",
    currencyCode: "INR",
    currencySymbol: "₹",
    signupBonus: 50,
    referralBonus: 100,
    refereeBonus: 50,
    signupBonusEnabled: true,
    referralBonusEnabled: true,
    tiersEnabled: true,
    averageOrderValue: 240,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  saved: {
    tiers: [
      {
        id: "t1",
        name: "Bronze",
        threshold: 0,
        pointsMultiplier: 1,
        color: "#a00",
        benefitsDescription: null,
      },
      {
        id: "t2",
        name: "Gold",
        threshold: 15000,
        pointsMultiplier: 1.5,
        color: "#fc0",
        benefitsDescription: null,
      },
    ],
    rules: [
      {
        id: "r1",
        name: "Standard",
        description: null,
        status: "active",
        pointsPerUnit: "0.10",
        multiplier: "1.00",
        bonusPoints: 0,
        allowedDays: [],
        isDefault: true,
        priority: 0,
      },
      {
        id: "r2",
        name: "Happy hour",
        description: null,
        status: "active",
        pointsPerUnit: "0.10",
        multiplier: "2.00",
        bonusPoints: 0,
        allowedDays: [],
        isDefault: false,
        priority: 1,
      },
      {
        id: "r3",
        name: "Monsoon",
        description: null,
        status: "active",
        pointsPerUnit: "0.10",
        multiplier: "1.00",
        bonusPoints: 100,
        allowedDays: [],
        isDefault: false,
        priority: 2,
      },
      {
        id: "r4",
        name: "Old promo",
        description: null,
        status: "inactive",
        pointsPerUnit: "0.10",
        multiplier: "1.00",
        bonusPoints: 0,
        allowedDays: [],
        isDefault: false,
        priority: 3,
      },
    ],
    rewards: [
      {
        id: "w1",
        name: "Free regular hot drink",
        description: null,
        status: "ACTIVE",
        pointsCost: 500,
        rewardType: "point",
        rewardValue: {},
      },
      {
        id: "w2",
        name: "₹50 off",
        description: null,
        status: "ACTIVE",
        pointsCost: 250,
        rewardType: "point",
        rewardValue: {},
      },
      {
        id: "w3",
        name: "MONSOON50",
        description: null,
        status: "ACTIVE",
        pointsCost: 0,
        rewardType: "coupon",
        rewardValue: {},
      },
      {
        id: "w4",
        name: "Brownie",
        description: null,
        status: "ACTIVE",
        pointsCost: 0,
        rewardType: "assigned",
        rewardValue: {},
      },
      {
        id: "w5",
        name: "Retired",
        description: null,
        status: "INACTIVE",
        pointsCost: 900,
        rewardType: "point",
        rewardValue: {},
      },
    ],
    commands: Array.from({ length: 5 }, (_, i) => ({
      type: `c${i}`,
      requestMessage: `k${i}`,
      content: null,
    })),
    triggers: [
      { eventType: "POINTS_ISSUED", enabled: true, waTemplateId: "a", templateStatus: "APPROVED" },
      { eventType: "BIRTHDAY", enabled: true, waTemplateId: "b", templateStatus: "PENDING" },
      {
        eventType: "INACTIVITY_REMINDER",
        enabled: true,
        waTemplateId: "c",
        templateStatus: "PENDING",
        triggerDays: 45,
      },
      { eventType: "TIER_UPGRADED", enabled: false, waTemplateId: "d", templateStatus: "APPROVED" },
    ],
  },
  counts: { tiers: 2, rules: 4, rewards: 5, commands: 5, triggers: 4 },
};

const dashboard = {
  tierDistribution: [
    { id: "t1", name: "Bronze", value: 812, threshold: 0, pointsMultiplier: 1, color: "#a00" },
    { id: "t2", name: "Gold", value: 2, threshold: 15000, pointsMultiplier: 1.5, color: "#fc0" },
    { id: null, name: "No Tier", value: 3, threshold: null, pointsMultiplier: null, color: null },
  ],
  popularRewards: [{ id: "w1", name: "Free regular hot drink", pointsCost: 500, redeemed: 34 }],
} as unknown as LoyaltyDashboardStats;

describe("buildSectionSummaries", () => {
  const sections = buildSectionSummaries({ t, state, dashboard, giveback });
  const byKey = Object.fromEntries(sections.map((s) => [s.key, s]));

  test("profile reads as one sentence about what customers see", () => {
    expect(byKey.profile.line).toBe("Points called Beans · ₹ INR · ₹240 a visit · no logo yet");
  });

  test("earning quotes the default rule, tags the extras and counts rules switched off", () => {
    expect(byKey.earning.line).toBe("0.1 Bean per ₹1 spent — about 24 Beans a visit");
    expect(byKey.earning.tags).toEqual([
      { label: "Happy hour · 2×", tone: "neutral" },
      { label: "Monsoon · +100 flat", tone: "neutral" },
      { label: "1 rule off", tone: "warning" },
    ]);
    expect(byKey.earning.attention).toBe(false);
  });

  test("tiers shows the member split from the dashboard, untiered members left out", () => {
    expect(byKey.tiers.caption).toBe("On · 2 tiers");
    expect(byKey.tiers.line).toBe("Bronze 812 · Gold 2");
  });

  // Program describes what the programme promises — its economics. What it *says* is the
  // Messages page's, and when it says it is Reminders'. A Messages card here showed the
  // same keyword replies and notifications a click away, and once the birthday gift and
  // quiet-days settings moved to Reminders its tags advertised controls it no longer held.
  test("Program carries no messages card — Messages owns that", () => {
    expect(byKey.messages).toBeUndefined();
    expect(Object.keys(byKey)).toEqual(["profile", "earning", "tiers"]);
  });

  test("a bare draft is honest about what is missing", () => {
    const draft = buildSectionSummaries({
      t,
      state: {
        ...state,
        program: { ...state.program!, tiersEnabled: false },
        saved: { tiers: [], rules: [], rewards: [], commands: [], triggers: [] },
      },
      dashboard: undefined,
      giveback: { ...giveback, pointsPerOrder: null },
    });
    const d = Object.fromEntries(draft.map((s) => [s.key, s]));
    expect(d.earning.line).toBe("No default rule — customers earn nothing yet");
    expect(d.earning.attention).toBe(true);
    expect(d.tiers.caption).toBe("Off · one flat rate");
  });
});
