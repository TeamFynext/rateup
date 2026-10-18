/**
 * A merchant's own payment gateway. RateUp never holds the money: links are created in the
 * merchant's account and paid into it. Webhooks and the customer's return to the checkout page
 * both confirm payment, so a missed webhook does not leave an order unpaid.
 */
export interface PaymentAccountCredential {
  /** Stripe secret key, or Razorpay key secret. */
  apiKey?: string;
  keyId?: string;
  keySecret?: string;
  webhookSecret?: string;
  webhookEndpointId?: string;
  accountName?: string;
  livemode?: boolean;
}

export interface CreateLinkInput {
  orderId: string;
  orderNumber: number;
  storeName: string;
  amount: number;
  currency: string;
  customer: { name?: string | null; email?: string | null; phone?: string | null };
  returnUrl: string;
  cancelUrl: string;
  expiresAt: Date;
}

export interface CreatedLink {
  url: string;
  providerRef: string;
  expiresAt?: Date;
}

export type ProviderPaymentState =
  | { state: "paid"; providerRef: string; paymentId: string | null; amount: number | null }
  | { state: "failed" | "expired"; providerRef: string }
  | { state: "refunded"; providerRef: string | null; paymentId: string; amountRefunded: number }
  | { state: "pending"; providerRef: string };

export interface PaymentProvider {
  id: "stripe" | "razorpay";
  label: string;
  /** Checks the keys and, where the provider allows it, registers the webhook. */
  connect(
    credential: PaymentAccountCredential,
    webhookUrl: string,
  ): Promise<PaymentAccountCredential>;
  disconnect?(credential: PaymentAccountCredential): Promise<void>;
  createLink(credential: PaymentAccountCredential, input: CreateLinkInput): Promise<CreatedLink>;
  /** The link's current state, asked of the provider directly. */
  fetchState(
    credential: PaymentAccountCredential,
    providerRef: string,
  ): Promise<ProviderPaymentState>;
  /** Verifies and reads a webhook; null for events that do not concern a payment. */
  parseWebhook(
    credential: PaymentAccountCredential,
    rawBody: string,
    headers: Record<string, string | string[] | undefined>,
  ): ProviderPaymentState | null;
  refund(
    credential: PaymentAccountCredential,
    paymentId: string,
    amount: number,
    currency: string,
  ): Promise<{ refundId: string }>;
}

/** Currencies quoted in whole units by the gateways (no cents). */
const ZERO_DECIMAL = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export const toMinorUnits = (amount: number, currency: string) =>
  ZERO_DECIMAL.has(currency.toUpperCase()) ? Math.round(amount) : Math.round(amount * 100);

export const fromMinorUnits = (amount: number, currency: string) =>
  ZERO_DECIMAL.has(currency.toUpperCase()) ? amount : amount / 100;
