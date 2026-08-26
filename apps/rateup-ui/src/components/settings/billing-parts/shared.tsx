// Shared types for the billing modules in `./` and in `dashboard/settings/billing/`.

/** A payment order row, as the orders endpoint returns it. */
export interface PaymentOrder {
  id: string;
  subscriptionId?: string;
  /** The gateway plan this order was created from — identifies the billed cadence. */
  planId?: string;
  subExpiry?: string;
  amount?: number;
  currency?: string;
  createdAt?: string;
  status?: string;
  paymentStatus?: string;
  subscriptionStatus?: string;
  subscriptionChargeAt?: string;
  subscriptionEndedAt?: string;
}
