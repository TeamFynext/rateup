import type { VerifyRedemptionResponse } from "@/api/loyalty/loyalty.type";

/**
 * What a typed code turns out to be.
 *
 * On the web this lives inside `CouponCodeForm.tsx` — the one pure function hiding in a
 * component. It is extracted here at port time rather than re-implemented in the screen,
 * because "is this code usable" is the decision that decides whether a customer walks away
 * with a reward they already paid for.
 */
export interface CouponLookup {
  /** A redemption code (coupon / point reward) or an issued gift's short code. */
  kind: "redemption" | "assigned";
  code: string;
  rewardName: string;
  customerName: string | null;
  usable: boolean;
  reason: string | null;
  pointsCost: number;
}

/** Reads the verify endpoint's answer into what the form shows. */
export function lookupFromVerify(code: string, response: VerifyRedemptionResponse): CouponLookup {
  const redemption = response.redemption;
  const status = redemption?.status ?? "";
  let reason: string | null = null;
  if (!redemption) reason = "No redemption with that code.";
  else if (redemption.usedAt) reason = "Already used.";
  else if (status === "PENDING") reason = "Waiting for approval.";
  else if (status !== "APPROVED") reason = "Not usable in its current state.";
  return {
    kind: "redemption",
    code,
    rewardName: response.reward?.name ?? "Reward",
    customerName: response.account?.contact?.name ?? null,
    usable: Boolean(redemption) && response.valid !== false && reason === null,
    reason,
    pointsCost: response.reward?.pointsCost ?? 0,
  };
}
