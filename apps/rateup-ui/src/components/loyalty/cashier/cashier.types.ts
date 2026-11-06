import type { LoyaltyNotificationOutcome } from "@/backend/loyalty/customer/customer.api";
import type { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";

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
}
