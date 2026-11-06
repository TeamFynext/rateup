import { LoyaltyEventType } from "@/api/loyalty/loyalty.type";

import type { Receipt, ReceiptCustomer } from "./cashier.types";
import type { EarnEstimate } from "./points-estimate";

/**
 * The receipt for a purchase that has been taken but not yet sent.
 *
 * Full parity says every action ends in a receipt. Parity does **not** mean the receipt
 * lies, and this is where the two pull against each other: `pointsAwarded`,
 * `customer.currentPoints`, `tier.previous` and `notification` all come from the server,
 * and offline there is none. So the rule is: *every number the server owns is either
 * omitted or visibly marked as an estimate; nothing is printed at server precision.*
 *
 * Two consequences worth stating, because both were tempting to get wrong:
 *
 * **The tier rows are suppressed entirely.** `estimateEarn` does not model tier crossing,
 * `amountToNext` is spend-based and shifts with every queued award, and `tier.previous`
 * exists only on the server's response. A wrongly announced "You're Gold now!" at the
 * counter is materially worse than saying nothing about tiers at all.
 *
 * **`before` is itself a cached number.** Two provisional figures stacked is exactly where
 * staff get burned, so `balanceAsOf` is carried and the receipt says when the balance was
 * last known.
 */
export function provisionalEarnReceipt(input: {
  customer: ReceiptCustomer;
  clientRef: string;
  estimate: EarnEstimate;
  /** The last balance read from the server, and when. */
  balanceBefore: number;
  balanceAsOf: string;
  amount: number;
  note?: string;
  now?: Date;
}): Receipt {
  const now = input.now ?? new Date();
  return {
    kind: "earned",
    customer: input.customer,
    before: input.balanceBefore,
    delta: input.estimate.points,
    after: input.balanceBefore + input.estimate.points,
    // Deliberately null — see the note above.
    tierBefore: null,
    tierAfter: null,
    nextTierName: null,
    amountToNext: null,
    amount: input.amount,
    note: input.note,
    event: LoyaltyEventType.POINTS_ISSUED,
    notification: null,

    provisional: true,
    clientRef: input.clientRef,
    queuedAt: now.toISOString(),
    balanceAsOf: input.balanceAsOf,
    estimate: {
      points: input.estimate.points,
      basePoints: input.estimate.basePoints,
      ruleName: input.estimate.rule.name,
      tierMultiplier: input.estimate.tierMultiplier,
    },
  };
}

/**
 * The receipt for a reward handed over while offline.
 *
 * Nothing here is estimated: marking a redemption or a gift used moves no balance, so the
 * only provisional part is whether the server has been told. The tier rows are still
 * dropped, for the same reason — they would be read from a cache of unknown age.
 */
export function provisionalMarkUsedReceipt(input: {
  customer: ReceiptCustomer;
  clientRef: string;
  rewardName: string;
  code: string;
  balanceBefore: number;
  balanceAsOf: string;
  now?: Date;
}): Receipt {
  const now = input.now ?? new Date();
  return {
    kind: "coupon_used",
    customer: input.customer,
    before: input.balanceBefore,
    delta: 0,
    after: input.balanceBefore,
    tierBefore: null,
    tierAfter: null,
    nextTierName: null,
    amountToNext: null,
    rewardName: input.rewardName,
    code: input.code,
    event: LoyaltyEventType.REWARD_REDEEMED,
    notification: null,

    provisional: true,
    clientRef: input.clientRef,
    queuedAt: now.toISOString(),
    balanceAsOf: input.balanceAsOf,
  };
}

/**
 * The receipt the drain replaces a provisional one with, when the server has spoken.
 *
 * The transition must be visible rather than silent: divergence is the whole reason a
 * provisional receipt is dangerous, and a caller reads `diverged` to decide whether to say
 * so out loud (and which haptic to fire).
 */
export function reconcile(
  provisional: Receipt,
  confirmed: { delta: number; after: number },
): { receipt: Receipt; diverged: boolean } {
  const diverged = confirmed.delta !== provisional.delta;
  return {
    receipt: {
      ...provisional,
      delta: confirmed.delta,
      after: confirmed.after,
      provisional: false,
      // The estimate is kept, not dropped: when the two differ, the receipt shows both so
      // staff can explain the number they already read out.
      estimate: provisional.estimate,
      // A ledger row carries no tier movement and no notification outcome, so neither can
      // be synthesised here — the probe path in particular knows the points and nothing else.
    },
    diverged,
  };
}
