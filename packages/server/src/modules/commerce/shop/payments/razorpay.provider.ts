import Razorpay from "razorpay";

import { ShopError } from "../shop.errors.js";
import { fromMinorUnits, toMinorUnits } from "../money.js";
import {
  type PaymentAccountCredential,
  type PaymentProvider,
  type ProviderPaymentState,
} from "./provider.types.js";

const client = (credential: PaymentAccountCredential) => {
  if (!credential.keyId || !credential.keySecret)
    throw new ShopError("PAYMENT_UNAVAILABLE", "Razorpay is not connected");
  return new Razorpay({ key_id: credential.keyId, key_secret: credential.keySecret });
};

/**
 * The Razorpay SDK rejects with a plain `{ statusCode, error: { description, … } }`, not an
 * Error, which nothing downstream knows how to report. This turns it into a ShopError that
 * carries Razorpay's own description; anything else passes through untouched.
 */
export function razorpayFailure(err: unknown): unknown {
  if (err instanceof Error || typeof err !== "object" || err === null) return err;
  const body = (err as { error?: { description?: unknown; code?: unknown } }).error;
  const description =
    typeof body?.description === "string" && body.description.trim()
      ? body.description.trim()
      : "Razorpay couldn't process that request";
  return new ShopError("PAYMENT_FAILED", `Razorpay: ${description}`);
}

/** The number as Razorpay takes it: `+` and digits, 8–14 characters, or nothing. */
export function razorpayContact(phone: string | null | undefined): string | undefined {
  const compact = phone?.replace(/[^\d+]/g, "");
  return compact && compact.length >= 8 && compact.length <= 14 ? compact : undefined;
}

async function call<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (err) {
    throw razorpayFailure(err);
  }
}

interface RazorpayLink {
  id: string;
  short_url: string;
  status: string;
  amount_paid?: number;
  currency?: string;
  payments?: { payment_id: string; status: string }[] | null;
  notes?: { orderId?: string } | null;
}

function linkState(link: RazorpayLink): ProviderPaymentState {
  if (link.status === "paid") {
    const payment = link.payments?.find((p) => p.status === "captured") ?? link.payments?.[0];
    return {
      state: "paid",
      providerRef: link.id,
      paymentId: payment?.payment_id ?? null,
      amount: link.amount_paid ? fromMinorUnits(link.amount_paid, link.currency ?? "INR") : null,
      currency: link.currency?.toUpperCase() ?? null,
      orderId: link.notes?.orderId ?? null,
    };
  }
  if (link.status === "expired" || link.status === "cancelled")
    return { state: "expired", providerRef: link.id };
  return { state: "pending", providerRef: link.id };
}

/** Razorpay webhooks are set up in the merchant's dashboard; the secret is pasted here. */
export const razorpayProvider: PaymentProvider = {
  id: "razorpay",
  label: "Razorpay",

  async connect(credential) {
    try {
      await client(credential).paymentLink.all({ count: 1 } as never);
    } catch {
      throw new ShopError("INVALID", "Razorpay didn't accept those keys");
    }
    return {
      ...credential,
      accountName: credential.accountName ?? "Razorpay account",
      livemode: credential.keyId!.startsWith("rzp_live"),
    };
  },

  async createLink(credential, input) {
    const link = (await call(() =>
      client(credential).paymentLink.create({
        amount: toMinorUnits(input.amount, input.currency),
        currency: input.currency.toUpperCase(),
        description: `${input.storeName} — order #${input.orderNumber}`,
        reference_id: `${input.orderId.slice(0, 30)}-${Date.now().toString(36)}`.slice(0, 40),
        expire_by: Math.floor(Math.max(input.expiresAt.getTime(), Date.now() + 16 * 60_000) / 1000),
        customer: {
          ...(input.customer.name ? { name: input.customer.name } : {}),
          ...(input.customer.email ? { email: input.customer.email } : {}),
          // Razorpay refuses the whole link over a contact outside 8–14 characters; a link
          // without one still works, the shopper just types it on Razorpay's page.
          ...(razorpayContact(input.customer.phone)
            ? { contact: razorpayContact(input.customer.phone) }
            : {}),
        },
        notify: { sms: false, email: false },
        callback_url: input.returnUrl,
        callback_method: "get",
        notes: { orderId: input.orderId, source: "rateup_shop" },
      } as never),
    )) as unknown as RazorpayLink;
    return { url: link.short_url, providerRef: link.id, expiresAt: input.expiresAt };
  },

  async fetchState(credential, providerRef) {
    return linkState(
      (await call(() =>
        client(credential).paymentLink.fetch(providerRef),
      )) as unknown as RazorpayLink,
    );
  },

  parseWebhook(credential, rawBody, headers) {
    const signature = headers["x-razorpay-signature"];
    if (!credential.webhookSecret || typeof signature !== "string")
      throw new ShopError("INVALID", "Missing Razorpay signature");
    if (!Razorpay.validateWebhookSignature(rawBody, signature, credential.webhookSecret))
      throw new ShopError("INVALID", "Bad Razorpay signature");
    const body = JSON.parse(rawBody) as {
      event: string;
      payload: {
        payment_link?: { entity: RazorpayLink };
        payment?: { entity: { id: string } };
        refund?: { entity: { payment_id: string; amount: number; currency: string } };
      };
    };
    if (body.event === "payment_link.paid" && body.payload.payment_link) {
      const state = linkState(body.payload.payment_link.entity);
      if (state.state === "paid" && !state.paymentId && body.payload.payment)
        return { ...state, paymentId: body.payload.payment.entity.id };
      return state;
    }
    if (
      (body.event === "payment_link.expired" || body.event === "payment_link.cancelled") &&
      body.payload.payment_link
    )
      return { state: "expired", providerRef: body.payload.payment_link.entity.id };
    if (body.event === "refund.processed" && body.payload.refund) {
      const r = body.payload.refund.entity;
      // The payload is this one refund; the running total is asked for in refundedTotal.
      return {
        state: "refunded",
        providerRef: null,
        paymentId: r.payment_id,
        amountRefunded: null,
      };
    }
    return null;
  },

  async expireLink(credential, providerRef) {
    await call(() => client(credential).paymentLink.cancel(providerRef));
  },

  async refundedTotal(credential, paymentId) {
    const payment = (await call(() => client(credential).payments.fetch(paymentId))) as unknown as {
      amount_refunded?: number;
      currency: string;
    };
    return fromMinorUnits(payment.amount_refunded ?? 0, payment.currency);
  },

  async refund(credential, paymentId, amount, currency) {
    const refund = await call(() =>
      client(credential).payments.refund(paymentId, {
        amount: toMinorUnits(amount, currency),
      }),
    );
    return { refundId: refund.id };
  },
};
