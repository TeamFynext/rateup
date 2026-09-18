// Shared types for the billing modules in this directory.

/** A payment order row, as the orders endpoint returns it. */
export interface PaymentOrder {
  id: string;
  /** The order's own name, as recorded at checkout. */
  name?: string;
  subscriptionId?: string;
  /** The gateway plan this order was created from — identifies the billed cadence. */
  planId?: string;
  subExpiry?: string;
  amount?: number;
  currency?: string;
  /** The catalog row behind the order. `ADDON` marks a one-off conversation-pack buy. */
  planType?: string;
  /** The plan or pack name, as the catalog names it. */
  displayName?: string;
  createdAt?: string;
  status?: string;
  paymentStatus?: string;
  subscriptionStatus?: string;
  subscriptionChargeAt?: string;
  subscriptionEndedAt?: string;
}
