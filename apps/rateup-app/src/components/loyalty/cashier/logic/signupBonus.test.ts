import { describe, expect, test } from "vitest";

import { signupBonusFor } from "./signupBonus";

describe("signupBonusFor", () => {
  test("promises the amount while the bonus is on", () => {
    expect(signupBonusFor({ signupBonus: 50, signupBonusEnabled: true })).toBe(50);
  });

  test("promises nothing once the bonus is switched off, whatever amount is kept", () => {
    expect(signupBonusFor({ signupBonus: 50, signupBonusEnabled: false })).toBe(0);
  });

  test("reads a missing flag from an older server as on", () => {
    expect(signupBonusFor({ signupBonus: 50 })).toBe(50);
  });
});
