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
  /** When a signed webhook last arrived: proof the merchant's webhook setup works. */
  lastWebhookAt?: string;
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
  | {
      state: "paid";
      providerRef: string;
      paymentId: string | null;
      amount: number | null;
      /** Upper-case ISO code, as the gateway charged it. */
      currency: string | null;
      /** The order RateUp tagged the link with when it created it. */
      orderId: string | null;
    }
  | { state: "failed" | "expired"; providerRef: string }
  /**
   * `amountRefunded` is the payment's total refunded so far, never one refund's amount; a
   * provider whose webhook names only the one refund leaves it null and answers
   * `refundedTotal` instead.
   */
  | {
      state: "refunded";
      providerRef: string | null;
      paymentId: string;
      amountRefunded: number | null;
    }
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
  /** Stops an older link from being paid. Best effort: a link already paid stays paid. */
  expireLink(credential: PaymentAccountCredential, providerRef: string): Promise<void>;
  /** The payment's total refunded so far, in major units. */
  refundedTotal(credential: PaymentAccountCredential, paymentId: string): Promise<number>;
  refund(
    credential: PaymentAccountCredential,
    paymentId: string,
    amount: number,
    currency: string,
  ): Promise<{ refundId: string }>;
}
