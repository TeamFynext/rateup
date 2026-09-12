import type { LoyaltyNotificationOutcome } from "@/api/loyalty/loyalty.type";
import type { LoyaltyEventType } from "@/api/loyalty/loyalty.type";

/** The customer a receipt is about — enough to list them under Recent afterwards. */
export interface ReceiptCustomer {
  id: string;
  contactId: string;
  name: string;
  phone: string;
  tierName: string | null;
}

/**
 * Every counter action ends in a receipt, not a toast: the customer is still standing
 * there asking what happened, and a toast is gone before the answer is read out.
 */
export interface Receipt {
  kind: "earned" | "redeemed" | "coupon_used" | "gift" | "joined";
  customer: ReceiptCustomer;
  /** Points balance before and after, and the signed change between them. */
  before: number;
  delta: number;
  after: number;
  tierBefore: string | null;
  tierAfter: string | null;
  nextTierName: string | null;
  amountToNext: number | null;
  /** Purchase details, on an `earned` receipt. */
  amount?: number;
  note?: string;
  /** Reward details, on the reward receipts. */
  rewardName?: string;
  code?: string;
  /** A coupon that needs approval before it can be used. */
  pendingApproval?: boolean;
  /** The WhatsApp event this action fires, for the message preview. */
  event: LoyaltyEventType | null;
  /** What the server said it sent, when it says. */
  notification: LoyaltyNotificationOutcome | null;

  /* ── provisional (app only) ──────────────────────────────────────────────────
   *
   * Set when the write is queued rather than accepted. Every field below is optional so
   * the shared render logic and the ported test suites are untouched by their presence.
   *
   * The rule these exist to enforce: **every number the server owns is either omitted or
   * visibly marked as an estimate; nothing is printed at server precision.** A receipt
   * that reads out a figure the server later disagrees with is worse than one that says
   * "about".
   */

  /** Queued, not yet accepted. Changes the title, the balance wording and the WA block. */
  provisional?: boolean;
  /** The outbox row this receipt is about, so the drain can correct it in place. */
  clientRef?: string;
  /** ISO, so the receipt can say when it was taken. */
  queuedAt?: string;
  /** The arithmetic behind `delta`, so it can be read out and defended. */
  estimate?: { points: number; basePoints: number; ruleName: string; tierMultiplier: number };
  /** When `before` was last read from the server — it is a cached number too. */
  balanceAsOf?: string;
}
