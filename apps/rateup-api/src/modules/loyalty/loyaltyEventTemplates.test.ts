import { describe, expect, test } from "vitest";

import { isJoinTap, joinButtonLabel, LOYALTY_JOIN_PAYLOAD } from "./loyaltyEventTemplates.js";

describe("isJoinTap", () => {
  test("a template's quick reply and an interactive button both count", () => {
    expect(isJoinTap({ buttonPayload: LOYALTY_JOIN_PAYLOAD })).toBe(true);
    expect(isJoinTap({ buttonId: LOYALTY_JOIN_PAYLOAD })).toBe(true);
  });

  test("any other button does not", () => {
    expect(isJoinTap({ buttonId: "loyalty_reward:r1", buttonPayload: "" })).toBe(false);
    expect(isJoinTap({})).toBe(false);
  });
});

describe("joinButtonLabel", () => {
  test("capitalises the join keyword and keeps it within Meta's limit", () => {
    expect(joinButtonLabel("signup")).toBe("Signup");
    expect(joinButtonLabel(null)).toBe("Join");
    expect(joinButtonLabel("x".repeat(40))).toHaveLength(25);
  });
});
