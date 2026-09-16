import { describe, expect, it } from "vitest";

import { isGatedWhileUnset } from "./setupGate.ts";

describe("isGatedWhileUnset", () => {
  it("lets the screens setup is done from through", () => {
    for (const path of [
      "/dashboard/loyalty/onboarding",
      "/dashboard/loyalty/dashboard",
      "/dashboard/loyalty/program",
      "/dashboard/loyalty/program/advanced",
    ]) {
      expect(isGatedWhileUnset(path)).toBe(false);
    }
  });

  it("gates every screen that needs a running programme", () => {
    for (const path of [
      "/dashboard/loyalty/cashier",
      "/dashboard/loyalty/customers",
      "/dashboard/loyalty/activity",
      "/dashboard/loyalty/messages",
      "/dashboard/loyalty/reminders",
      "/dashboard/loyalty/templates/abc",
      "/dashboard/loyalty/feedback",
      "/dashboard/loyalty/materials",
      "/dashboard/loyalty/settings",
    ]) {
      expect(isGatedWhileUnset(path)).toBe(true);
    }
  });

  it("matches on a path boundary, not a bare prefix", () => {
    expect(isGatedWhileUnset("/dashboard/loyalty/programs-report")).toBe(true);
  });
});
