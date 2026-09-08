import type { TFunction } from "i18next";
import { describe, expect, test } from "vitest";

import type { LoyaltyDashboardStats } from "@/backend/loyalty/dashboard/dashboard.query";
import type { OnboardingState } from "@/backend/loyalty/onboarding.api";

import type { GivebackResult } from "../giveback/calculateGiveback";
import { buildProgramProgress } from "../program/programProgress";
import { buildSuggestions, type SuggestionInput } from "./suggestions";

const t = ((key: string, opts?: Record<string, unknown>) =>
  key.replace(/\{(\w+)\}/g, (_m, name: string) =>
    String(opts?.[name] ?? ""),
  )) as unknown as TFunction;

const giveback = {
  pointsPerOrder: 24,
  pointValue: { best: 0.24, worst: 0.2 },
} as unknown as GivebackResult;

function liveState(
  over: Partial<OnboardingState["saved"]> = {},
  program: Record<string, unknown> = {},
): OnboardingState {
  return {
    presetKey: "cafe",
    lastCompletedStep: "messages",
    program: {
      id: "p",
      orgId: "o",
      name: "P",
      status: "active",
      currencyName: "Beans",
      currencyCode: "INR",
      currencySymbol: "₹",
      signupBonus: 0,
      referralBonus: 0,
      refereeBonus: 0,
      tiersEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...program,
    } as OnboardingState["program"],
    saved: {
      tiers: [],
      rules: [
        {
          id: "r",
          name: "Standard",
          description: null,
          pointsPerUnit: 1,
          multiplier: 1,
          bonusPoints: 0,
          allowedDays: [],
          isDefault: true,
          priority: 0,
        },
      ],
      rewards: [
        {
          id: "w",
          name: "Coffee",
          description: null,
          status: "ACTIVE",
          pointsCost: 500,
          rewardType: "point",
          rewardValue: {},
        },
      ],
      commands: [],
      triggers: [],
      ...over,
    },
    counts: { tiers: 0, rules: 1, rewards: 1, commands: 0, triggers: 0 },
  };
}

function dashboard(over: Record<string, unknown> = {}): LoyaltyDashboardStats {
  return {
    metrics: { totalMembers: 957 },
    rewardsAffordability: {
      cheapestRewardCost: 250,
      cheapestRewardName: "₹50 off",
      membersBelowCheapestReward: 604,
    },
    tierDistribution: [
      { id: "t1", name: "Bronze", value: 812, threshold: 0, pointsMultiplier: 1, color: null },
      {
        id: "t2",
        name: "Silver",
        value: 143,
        threshold: 5000,
        pointsMultiplier: 1.25,
        color: null,
      },
      { id: "t3", name: "Gold", value: 2, threshold: 15000, pointsMultiplier: 1.5, color: null },
    ],
    ...over,
  } as unknown as LoyaltyDashboardStats;
}

function input(over: Partial<SuggestionInput> = {}): SuggestionInput {
  const state = over.state ?? liveState();
  return {
    t,
    programState: "live",
    pointsName: "Beans",
    state,
    dashboard: dashboard(),
    giveback,
    progress: buildProgramProgress(state),
    templatesPending: 0,
    hasWhatsappChannel: true,
    ...over,
  };
}

describe("buildSuggestions", () => {
  test("a healthy live programme still gets the data-driven nudges, most urgent first, capped at three", () => {
    const out = buildSuggestions(input({ templatesPending: 2 }));
    expect(out.map((s) => s.id)).toEqual(["templates_pending", "cheap_reward", "tiny_tier"]);
    expect(out[1].body).toContain("604 of 957 members");
    expect(out[2].title).toBe("Gold has 2 members — lower the threshold");
    expect(out[2].target).toEqual({
      to: "/dashboard/loyalty/program",
      search: { section: "tiers" },
    });
  });

  test("a disconnected channel and a missing default rule outrank everything", () => {
    const out = buildSuggestions(
      input({ hasWhatsappChannel: false, state: liveState({ rules: [] }) }),
    );
    expect(out.slice(0, 2).map((s) => s.id)).toEqual(["wa_not_connected", "no_default_rule"]);
    expect(out.every((s) => s.severity <= 2)).toBe(true);
  });

  test("no rewards at all is called out on a live programme", () => {
    const out = buildSuggestions(
      input({
        state: liveState({ rewards: [] }),
        dashboard: dashboard({
          rewardsAffordability: {
            cheapestRewardCost: null,
            cheapestRewardName: null,
            membersBelowCheapestReward: null,
          },
        }),
      }),
    );
    expect(out.map((s) => s.id)).toContain("no_rewards");
    expect(out.map((s) => s.id)).not.toContain("cheap_reward");
  });

  test("the cheap-reward nudge needs a real membership and a majority below the bar", () => {
    const few = buildSuggestions(
      input({ dashboard: dashboard({ metrics: { totalMembers: 10 } }) }),
    );
    expect(few.map((s) => s.id)).not.toContain("cheap_reward");

    const minority = buildSuggestions(
      input({
        dashboard: dashboard({
          rewardsAffordability: {
            cheapestRewardCost: 250,
            cheapestRewardName: "x",
            membersBelowCheapestReward: 100,
          },
        }),
      }),
    );
    expect(minority.map((s) => s.id)).not.toContain("cheap_reward");
  });

  test("a draft is told to finish its messages and print the QR, never about live numbers", () => {
    const state: OnboardingState = {
      ...liveState(),
      lastCompletedStep: "rewards",
      program: { ...liveState().program!, status: "draft" },
    };
    const out = buildSuggestions(
      input({
        programState: "draft",
        state,
        progress: buildProgramProgress(state),
        dashboard: undefined,
      }),
    );
    expect(out.map((s) => s.id)).toEqual(["draft_messages", "print_qr"]);
    expect(out[0].target).toEqual({ to: "/dashboard/loyalty/onboarding" });
  });
});
