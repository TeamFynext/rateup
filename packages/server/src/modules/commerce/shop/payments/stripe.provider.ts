import Stripe from "stripe";

import { ShopError } from "../shop.errors.js";
import { fromMinorUnits, toMinorUnits } from "../money.js";
import {
  type PaymentAccountCredential,
  type PaymentProvider,
  type ProviderPaymentState,
} from "./provider.types.js";

const client = (credential: PaymentAccountCredential) => {
  if (!credential.apiKey) throw new ShopError("PAYMENT_UNAVAILABLE", "Stripe is not connected");
  return new Stripe(credential.apiKey);
};

const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "charge.refunded",
];

function sessionState(session: Stripe.Checkout.Session): ProviderPaymentState {
  if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
    return {
      state: "paid",
      providerRef: session.id,
      paymentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
      amount:
        session.amount_total === null
          ? null
          : fromMinorUnits(session.amount_total, session.currency ?? "usd"),
      currency: session.currency?.toUpperCase() ?? null,
      orderId: session.metadata?.orderId ?? null,
    };
  }
  if (session.status === "expired") return { state: "expired", providerRef: session.id };
  return { state: "pending", providerRef: session.id };
}

export const stripeProvider: PaymentProvider = {
  id: "stripe",
  label: "Stripe",

  async connect(credential, webhookUrl) {
    const stripe = client(credential);
    let account: Stripe.Account;
    try {
      account = await stripe.accounts.retrieveCurrent();
    } catch {
      throw new ShopError(
        "INVALID",
        "Stripe didn't accept that key. Use a secret key (sk_…) or a restricted key with Checkout and Webhook access.",
      );
    }
    const endpoint = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: WEBHOOK_EVENTS,
      description: "RateUp shop payments",
    });
    return {
      apiKey: credential.apiKey,
      webhookSecret: endpoint.secret,
      webhookEndpointId: endpoint.id,
      accountName:
        account.settings?.dashboard?.display_name ??
        account.business_profile?.name ??
        account.email ??
        "Stripe account",
      livemode:
        !credential.apiKey!.startsWith("sk_test") && !credential.apiKey!.startsWith("rk_test"),
    };
  },

  async disconnect(credential) {
    if (!credential.webhookEndpointId) return;
    await client(credential)
      .webhookEndpoints.del(credential.webhookEndpointId)
      .catch(() => {});
  },

  async createLink(credential, input) {
    const stripe = client(credential);
    // Stripe accepts an expiry between 30 minutes and 24 hours from now.
    const min = Date.now() + 31 * 60_000;
    const max = Date.now() + 23.9 * 3_600_000;
    const expiresAt = new Date(Math.min(Math.max(input.expiresAt.getTime(), min), max));
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: input.orderId,
      metadata: { orderId: input.orderId, source: "rateup_shop" },
      payment_intent_data: { metadata: { orderId: input.orderId, source: "rateup_shop" } },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: toMinorUnits(input.amount, input.currency),
            product_data: { name: `${input.storeName} — order #${input.orderNumber}` },
          },
        },
      ],
      ...(input.customer.email ? { customer_email: input.customer.email } : {}),
      success_url: input.returnUrl,
      cancel_url: input.cancelUrl,
      expires_at: Math.floor(expiresAt.getTime() / 1000),
    });
    if (!session.url) throw new ShopError("PAYMENT_FAILED", "Stripe did not return a payment page");
    return { url: session.url, providerRef: session.id, expiresAt };
  },

  async fetchState(credential, providerRef) {
    return sessionState(await client(credential).checkout.sessions.retrieve(providerRef));
  },

  parseWebhook(credential, rawBody, headers) {
    if (!credential.webhookSecret) return null;
    const signature = headers["stripe-signature"];
    if (typeof signature !== "string") throw new ShopError("INVALID", "Missing Stripe signature");
    let event: Stripe.Event;
    try {
      event = Stripe.webhooks.constructEvent(rawBody, signature, credential.webhookSecret);
    } catch {
      throw new ShopError("INVALID", "Bad Stripe signature");
    }
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
      case "checkout.session.expired":
        return sessionState(event.data.object);
      case "checkout.session.async_payment_failed":
        return { state: "failed", providerRef: event.data.object.id };
      case "charge.refunded": {
        const charge = event.data.object;
        if (typeof charge.payment_intent !== "string") return null;
        return {
          state: "refunded",
          providerRef: null,
          paymentId: charge.payment_intent,
          amountRefunded: fromMinorUnits(charge.amount_refunded, charge.currency),
        };
      }
      default:
        return null;
    }
  },

  async expireLink(credential, providerRef) {
    await client(credential).checkout.sessions.expire(providerRef);
  },

  async refundedTotal(credential, paymentId) {
    const intent = await client(credential).paymentIntents.retrieve(paymentId, {
      expand: ["latest_charge"],
    });
    const charge = intent.latest_charge;
    if (!charge || typeof charge === "string") return 0;
    return fromMinorUnits(charge.amount_refunded, charge.currency);
  },

  async refund(credential, paymentId, amount, currency) {
    const refund = await client(credential).refunds.create({
      payment_intent: paymentId,
      amount: toMinorUnits(amount, currency),
    });
    return { refundId: refund.id };
  },
};
