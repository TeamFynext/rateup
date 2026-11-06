import { describe, expect, test } from "vitest";

import type { VerifyRedemptionResponse } from "@/api/loyalty/loyalty.type";

import { lookupFromVerify } from "./cashier.coupon";

function verify(over: Partial<VerifyRedemptionResponse> = {}): VerifyRedemptionResponse {
  return {
    valid: true,
    redemption: {
      id: "r1",
      redemptionCode: "KC-4471",
      status: "APPROVED",
      usedAt: null,
      expiresAt: null,
      createdAt: "2026-09-10T08:00:00.000Z",
    },
    reward: { id: "rw1", name: "Free coffee", pointsCost: 200, rewardType: "point" },
    account: { id: "a1", contact: { name: "Priya", phone: "919876541207" } },
    ...over,
  };
}

describe("lookupFromVerify", () => {
  test("an approved, unused code is usable and names who it belongs to", () => {
    const found = lookupFromVerify("KC-4471", verify());
    expect(found.usable).toBe(true);
    expect(found.reason).toBeNull();
    expect(found.rewardName).toBe("Free coffee");
    expect(found.customerName).toBe("Priya");
    expect(found.pointsCost).toBe(200);
  });

  // Each of these is a customer standing at the counter being told "no" — the reason has to
  // be the right one, because it is what staff read out.
  test("an already-used code says so, and is not usable", () => {
    const found = lookupFromVerify(
      "KC-4471",
      verify({
        redemption: { ...verify().redemption!, usedAt: "2026-09-10T09:00:00.000Z" },
      }),
    );
    expect(found.usable).toBe(false);
    expect(found.reason).toBe("Already used.");
  });

  test("a code still awaiting approval is not usable", () => {
    const found = lookupFromVerify(
      "KC-4471",
      verify({ redemption: { ...verify().redemption!, status: "PENDING" } }),
    );
    expect(found.usable).toBe(false);
    expect(found.reason).toBe("Waiting for approval.");
  });

  test("any other state is refused rather than guessed at", () => {
    for (const status of ["CANCELLED", "EXPIRED", "REJECTED", "USED"]) {
      const found = lookupFromVerify(
        "KC-4471",
        verify({ redemption: { ...verify().redemption!, status } }),
      );
      expect(found.usable).toBe(false);
      expect(found.reason).toBe("Not usable in its current state.");
    }
  });

  test("no redemption at all is not usable", () => {
    const found = lookupFromVerify("KC-4471", verify({ redemption: null }));
    expect(found.usable).toBe(false);
    expect(found.reason).toBe("No redemption with that code.");
  });

  // `valid: false` with an otherwise-fine redemption is the server disagreeing; it wins.
  test("the server's own verdict overrides an otherwise-usable code", () => {
    expect(lookupFromVerify("KC-4471", verify({ valid: false })).usable).toBe(false);
  });

  test("a reward the response does not name still renders", () => {
    const found = lookupFromVerify("KC-4471", verify({ reward: undefined, account: null }));
    expect(found.rewardName).toBe("Reward");
    expect(found.customerName).toBeNull();
    expect(found.pointsCost).toBe(0);
  });
});
