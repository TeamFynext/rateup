import { describe, expect, test } from "vitest";

import { isLReferralAction, isPurchaseAction, LoyaltyActionType, parsePhoneforWa } from "./util.js";

// ===========================================================================
// util.ts
// ===========================================================================

describe("parsePhoneforWa", () => {
  test("strips a single leading plus", () => {
    expect(parsePhoneforWa("+919000000001")).toBe("919000000001");
  });

  test("leaves a bare number alone", () => {
    expect(parsePhoneforWa("919000000001")).toBe("919000000001");
  });

  test("tolerates an empty or missing value", () => {
    expect(parsePhoneforWa("")).toBe("");
    expect(parsePhoneforWa(undefined as any)).toBeUndefined();
  });

  test("removes every leading plus", () => {
    expect(parsePhoneforWa("++919000000001")).toBe("919000000001");
  });

  // Still only LEADING ones: a plus in the middle is not a formatting artefact and
  // stripping it would silently change the number.
  test("leaves a plus that is not at the front alone", () => {
    expect(parsePhoneforWa("91+9000000001")).toBe("91+9000000001");
  });
});

describe("the action-type predicates", () => {
  test("only a referral purchase is a referral action", () => {
    expect(isLReferralAction(LoyaltyActionType.ReferralPurchase)).toBe(true);
    expect(isLReferralAction(LoyaltyActionType.DirectPurchase)).toBe(false);
  });

  test("both purchase kinds are purchase actions", () => {
    expect(isPurchaseAction(LoyaltyActionType.ReferralPurchase)).toBe(true);
    expect(isPurchaseAction(LoyaltyActionType.DirectPurchase)).toBe(true);
    expect(isPurchaseAction(LoyaltyActionType.FeedBack)).toBe(false);
  });

  test("an unknown action is neither", () => {
    expect(isLReferralAction("Nonsense" as unknown as LoyaltyActionType)).toBe(false);
    expect(isPurchaseAction("Nonsense" as unknown as LoyaltyActionType)).toBe(false);
  });
});
