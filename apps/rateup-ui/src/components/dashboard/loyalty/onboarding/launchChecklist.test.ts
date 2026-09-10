import type { TFunction } from "i18next";
import { describe, expect, test } from "vitest";

import type { OnboardingState } from "@/backend/loyalty/onboarding.api";

import { buildLaunchChecklist } from "./launchChecklist";

const t = ((key: string, vars?: Record<string, unknown>) =>
  vars
    ? Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), key)
    : key) as unknown as TFunction;

const empty: OnboardingState = {
  program: null,
  presetKey: null,
  lastCompletedStep: null,
  saved: { tiers: [], rules: [], rewards: [], commands: [], triggers: [] },
  counts: { tiers: 0, rules: 0, rewards: 0, commands: 0, triggers: 0 },
};

const program = {
  id: "p",
  orgId: "o",
  name: "Kettle & Co",
  status: "draft" as const,
  currencyName: "Beans",
  currencyCode: "INR",
  currencySymbol: "₹",
  signupBonus: 0,
  referralBonus: 0,
  refereeBonus: 0,
  tiersEnabled: true,
  logoUrl: "https://x/logo.png",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("buildLaunchChecklist", () => {
  test("nothing saved is all to do, the channel included — the QR needs it", () => {
    const items = buildLaunchChecklist(empty, false, t);
    expect(items.map((i) => i.status)).toEqual(["todo", "todo", "todo", "todo", "todo", "todo"]);
    expect(items.find((i) => i.id === "channel")?.link).toBe("channels");
  });

  test("a connected channel reads done", () => {
    const items = buildLaunchChecklist(empty, true, t);
    expect(items.find((i) => i.id === "channel")?.status).toBe("done");
  });

  test("a complete draft reads done, and counts the VIP-only rewards", () => {
    const items = buildLaunchChecklist(
      {
        ...empty,
        program,
        counts: { tiers: 2, rules: 1, rewards: 3, commands: 5, triggers: 4 },
        saved: {
          ...empty.saved,
          rewards: [
            {
              id: "1",
              name: "a",
              description: null,
              pointsCost: 1,
              rewardType: "point",
              rewardValue: {},
            },
            {
              id: "2",
              name: "b",
              description: null,
              pointsCost: 1,
              rewardType: "point",
              rewardValue: {},
              availableForTiers: ["vip"],
            },
          ],
        },
      },
      true,
      t,
    );
    expect(items.every((i) => i.status === "done")).toBe(true);
    expect(items.find((i) => i.id === "rewards")?.detail).toBe("3 rewards, 1 of them VIP-only");
    expect(items.find((i) => i.id === "profile")?.detail).toBe("Kettle & Co, logo and colour set");
  });

  test("a flat programme makes the VIP row optional, not a blocker", () => {
    const items = buildLaunchChecklist(
      { ...empty, program: { ...program, tiersEnabled: false } },
      false,
      t,
    );
    expect(items.find((i) => i.id === "tiers")?.status).toBe("optional");
  });
});
