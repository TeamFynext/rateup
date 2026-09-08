import { describe, expect, test } from "vitest";

import type { OnboardingState } from "@/backend/loyalty/onboarding.api";

import { buildProgramProgress } from "./programProgress";

const base: OnboardingState = {
  program: null,
  presetKey: null,
  lastCompletedStep: null,
  saved: { tiers: [], rules: [], rewards: [], commands: [], triggers: [] },
  counts: { tiers: 0, rules: 0, rewards: 0, commands: 0, triggers: 0 },
};

const program = (status: "draft" | "active" | "paused") =>
  ({
    id: "p",
    orgId: "o",
    name: "P",
    status,
    currencyName: "Points",
    currencyCode: "INR",
    currencySymbol: "₹",
    signupBonus: 0,
    referralBonus: 0,
    refereeBonus: 0,
    tiersEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as NonNullable<OnboardingState["program"]>;

describe("buildProgramProgress", () => {
  test("nothing saved means six steps left and basics next", () => {
    const p = buildProgramProgress(base);
    expect(p.leftCount).toBe(6);
    expect(p.nextStep).toBe("basics");
    expect(p.isLive).toBe(false);
  });

  test("a draft counts every saved step as done and points at the next", () => {
    const p = buildProgramProgress({
      ...base,
      program: program("draft"),
      lastCompletedStep: "rewards",
    });
    expect(p.steps.map((s) => s.done)).toEqual([true, true, true, true, false, false]);
    expect(p.doneCount).toBe(4);
    expect(p.leftCount).toBe(2);
    expect(p.nextStep).toBe("messages");
  });

  test("a live or paused programme is fully done, whatever the last step recorded", () => {
    for (const status of ["active", "paused"] as const) {
      const p = buildProgramProgress({
        ...base,
        program: program(status),
        lastCompletedStep: "tiers",
      });
      expect(p.leftCount).toBe(0);
      expect(p.nextStep).toBeNull();
      expect(p.isLive).toBe(true);
    }
  });

  test("tolerates no state at all", () => {
    expect(buildProgramProgress(undefined).leftCount).toBe(6);
  });
});
