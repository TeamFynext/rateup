import type { TFunction } from "i18next";
import { describe, expect, test } from "vitest";

import { buildLoyaltyNavItems } from "./loyalty.nav";

const t = ((key: string) => key) as unknown as TFunction;

describe("buildLoyaltyNavItems", () => {
  test("nine rows, in the order the owner works through them", () => {
    const rows = buildLoyaltyNavItems({ t, programState: "live" });
    expect(rows.map((r) => r.title)).toEqual([
      "Overview",
      "Cashier",
      "Customers",
      "Program",
      "Activity",
      "Messages",
      "Feedback",
      "Materials",
      "Settings",
    ]);
  });

  test("Program carries the programme's state as a text badge", () => {
    expect(buildLoyaltyNavItems({ t, programState: "live" })[3]).toMatchObject({
      badge: "Live",
      badgeTone: "success",
    });
    expect(buildLoyaltyNavItems({ t, programState: "paused" })[3]).toMatchObject({
      badge: "Paused",
      badgeTone: "warning",
    });
    expect(buildLoyaltyNavItems({ t, programState: "draft" })[3]).toMatchObject({
      badge: "Draft",
      badgeTone: "neutral",
    });
    expect(buildLoyaltyNavItems({ t, programState: null })[3]).not.toHaveProperty("badge");
  });

  test("counts land on Customers, Activity and Messages only", () => {
    const rows = buildLoyaltyNavItems({
      t,
      programState: "live",
      members: 957,
      pendingApprovals: 3,
      templatesPending: 2,
    });
    expect(rows.map((r) => r.count)).toEqual([
      undefined,
      undefined,
      957,
      undefined,
      3,
      2,
      undefined,
      undefined,
      undefined,
    ]);
  });

  test("Feedback flags a flow that cannot send yet, and says nothing once it can", () => {
    expect(
      buildLoyaltyNavItems({ t, programState: "live", feedbackState: "draft" })[6],
    ).toMatchObject({ title: "Feedback", badge: "Draft", badgeTone: "neutral" });
    expect(
      buildLoyaltyNavItems({ t, programState: "live", feedbackState: "pending" })[6],
    ).toMatchObject({ badge: "Awaiting Meta", badgeTone: "warning" });
    expect(
      buildLoyaltyNavItems({ t, programState: "live", feedbackState: "live" })[6],
    ).not.toHaveProperty("badge");
    expect(buildLoyaltyNavItems({ t, programState: "live" })[6]).not.toHaveProperty("badge");
  });

  test("Program stays lit while the wizard or a full editor is open", () => {
    expect(
      buildLoyaltyNavItems({
        t,
        programState: "draft",
        pathname: "/dashboard/loyalty/onboarding",
      })[3].isActive,
    ).toBe(true);
    expect(
      buildLoyaltyNavItems({
        t,
        programState: "live",
        pathname: "/dashboard/loyalty/program/advanced",
      })[3].isActive,
    ).toBe(true);
    expect(
      buildLoyaltyNavItems({ t, programState: "live", pathname: "/dashboard/loyalty/cashier" })[3]
        .isActive,
    ).toBeUndefined();
  });
});
