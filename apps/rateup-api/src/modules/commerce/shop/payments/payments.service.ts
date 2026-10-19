import type { ShopOrder, ShopStore } from "../../../../../generated/prisma/client.js";
import { paysInStore, storeLabel } from "../checkoutVia.js";
import { appConfig as config } from "../../../../config.js";
import { log } from "../../../../utils/logger.js";
import prisma from "../../../../utils/prisma.js";
import { checkoutUrl } from "../events.js";
import {
  addOrderEvent,
  markOrderPaid,
  newCheckoutToken,
  prepareDraftForPayment,
  releaseOrderBenefits,
  reserveOrderBenefits,
} from "../orders.service.js";
import { onShopOrderEvent } from "../events.js";
import { round2, toNumber } from "../pricing.js";
import { notFound, ShopError } from "../shop.errors.js";
import { assertCanTakeOrder } from "../orderAllowance.js";
import type {
  PaymentAccountCredential,
  PaymentProvider,
  ProviderPaymentState,
} from "./provider.types.js";
import { razorpayProvider } from "./razorpay.provider.js";
import { stripeProvider } from "./stripe.provider.js";
import { inStoreCheckout } from "../checkoutVia.js";

export const PAYMENT_PROVIDERS: readonly PaymentProvider[] = [stripeProvider, razorpayProvider];

export type PaymentProviderId = PaymentProvider["id"];

export function getPaymentProvider(id: string): PaymentProvider {
  const provider = PAYMENT_PROVIDERS.find((p) => p.id === id);
  if (!provider) throw new ShopError("INVALID", "Unknown payment provider");
  return provider;
}

const integrationName = (id: PaymentProviderId) => `shop_${id}`;

/** Where the provider posts events for this store. */
export const webhookUrl = (provider: PaymentProviderId, storeId: string) =>
  `${config.backendUrl}/api/public/shop/payments/${provider}/${storeId}`;

/** WhatsApp Pay works only for businesses in these markets, in their own currency. */
const WHATSAPP_PAY_CURRENCIES = new Set(["INR", "BRL", "SGD"]);

export async function getPaymentAccount(orgId: string, provider: PaymentProviderId) {
  const row = await prisma.integration.findUnique({
    where: { orgid_integration_name_unique: { orgId, name: integrationName(provider) } },
  });
  if (!row || !row.active) return null;
  return { row, credential: row.credential as PaymentAccountCredential };
}

/** What the payments settings page shows. Never includes keys. */
export async function listPaymentMethods(store: ShopStore) {
  const rows = await prisma.integration.findMany({
    where: {
      orgId: store.orgId,
      name: { in: PAYMENT_PROVIDERS.map((p) => integrationName(p.id)) },
    },
  });
  const providers = PAYMENT_PROVIDERS.map((p) => {
    const row = rows.find((r) => r.name === integrationName(p.id));
    const cred = (row?.credential ?? {}) as PaymentAccountCredential;
    return {
      id: p.id,
      label: p.label,
      connected: !!row?.active,
      accountName: row?.active ? (cred.accountName ?? null) : null,
      livemode: row?.active ? (cred.livemode ?? null) : null,
      webhookUrl: webhookUrl(p.id, store.id),
      webhookConfigured: !!cred.webhookSecret,
      lastWebhookAt: row?.active ? (cred.lastWebhookAt ?? null) : null,
      isDefault: store.defaultPaymentProvider === p.id,
      lastError: row?.lastError ?? null,
    };
  });
  return {
    providers,
    whatsappPay: {
      available: WHATSAPP_PAY_CURRENCIES.has(store.currency.toUpperCase()),
      currencies: [...WHATSAPP_PAY_CURRENCIES],
    },
    cod: {
      enabled: store.codEnabled,
      confirm: store.codConfirm,
      confirmHours: store.codConfirmHours,
      prepaidDiscountPct:
        store.codPrepaidDiscountPct === null ? null : toNumber(store.codPrepaidDiscountPct),
    },
    bankTransfer: { enabled: store.bankTransferEnabled, details: store.bankDetails ?? null },
  };
}

export async function connectPaymentProvider(
  store: ShopStore,
  providerId: PaymentProviderId,
  input: PaymentAccountCredential,
) {
  const provider = getPaymentProvider(providerId);
  const existing = await getPaymentAccount(store.orgId, providerId);
  if (existing && provider.disconnect)
    await provider.disconnect(existing.credential).catch(() => {});
  const credential = await provider.connect(input, webhookUrl(providerId, store.id));
  await prisma.integration.upsert({
    where: {
      orgid_integration_name_unique: { orgId: store.orgId, name: integrationName(providerId) },
    },
    create: {
      orgId: store.orgId,
      name: integrationName(providerId),
      credential: { ...credential },
      active: true,
    },
    update: {
      credential: { ...credential },
      active: true,
      lastError: null,
      consecutiveFailures: 0,
    },
  });
  if (!store.defaultPaymentProvider) {
    await prisma.shopStore.update({
      where: { id: store.id },
      data: { defaultPaymentProvider: providerId },
    });
  }
  return listPaymentMethods(await prisma.shopStore.findUniqueOrThrow({ where: { id: store.id } }));
}

/** Razorpay's webhook secret is set in its dashboard and pasted back here. */
export async function setWebhookSecret(
  store: ShopStore,
  providerId: PaymentProviderId,
  secret: string,
) {
  const account = await getPaymentAccount(store.orgId, providerId);
  if (!account) throw new ShopError("PAYMENT_UNAVAILABLE", "Connect the account first");
  await prisma.integration.update({
    where: { id: account.row.id },
    data: { credential: { ...account.credential, webhookSecret: secret.trim() } },
  });
}

export async function disconnectPaymentProvider(store: ShopStore, providerId: PaymentProviderId) {
  const provider = getPaymentProvider(providerId);
  const account = await getPaymentAccount(store.orgId, providerId);
  if (!account) return;
  if (provider.disconnect) await provider.disconnect(account.credential).catch(() => {});
  await prisma.integration.delete({ where: { id: account.row.id } });
  if (store.defaultPaymentProvider === providerId) {
    const other = await prisma.integration.findFirst({
      where: {
        orgId: store.orgId,
        active: true,
        name: { in: PAYMENT_PROVIDERS.map((p) => integrationName(p.id)) },
      },
    });
    await prisma.shopStore.update({
      where: { id: store.id },
      data: { defaultPaymentProvider: other ? other.name.replace("shop_", "") : null },
    });
  }
}

/** The gateway a new payment link uses: the store's default if connected, else any connected one. */
export async function pickProvider(store: ShopStore, wanted?: string | null) {
  const order = [
    wanted,
    store.defaultPaymentProvider,
    ...PAYMENT_PROVIDERS.map((p) => p.id),
  ].filter(
    (p, i, all): p is PaymentProviderId =>
      !!p && all.indexOf(p) === i && PAYMENT_PROVIDERS.some((x) => x.id === p),
  );
  for (const id of order) {
    const account = await getPaymentAccount(store.orgId, id);
    if (account) return { provider: getPaymentProvider(id), credential: account.credential };
  }
  return null;
}

/**
 * Creates a fresh payment link for what the order costs now, and closes older pending links at
 * the gateway so one from before a coupon cannot be paid. Closing is best effort; a payment that
 * slips through on an old link is checked against the order's total in `applyState`.
 */
async function closeLink(orgId: string, payment: { provider: string; providerRef: string | null }) {
  if (!payment.providerRef || !PAYMENT_PROVIDERS.some((p) => p.id === payment.provider)) return;
  const provider = getPaymentProvider(payment.provider);
  const account = await getPaymentAccount(orgId, provider.id);
  if (!account) return;
  await provider
    .expireLink(account.credential, payment.providerRef)
    .catch((err) =>
      log.warn({ err, providerRef: payment.providerRef }, "Could not close an older payment link"),
    );
}

/** After a cancel: the links it expired are closed at the gateway too. */
export async function closeOpenLinks(orgId: string, orderId: string) {
  const links = await prisma.shopPayment.findMany({
    where: { orderId, status: "EXPIRED", providerRef: { not: null }, paidAt: null },
  });
  await Promise.all(links.map((payment) => closeLink(orgId, payment)));
}

/**
 * `acceptPriceChange`: the caller tells the customer the new total itself (the chat message
 * that carries the link); otherwise a draft whose prices moved is refused so they see it first.
 */
export async function createPaymentLink(
  orderId: string,
  opts: { provider?: string | null; acceptPriceChange?: boolean } = {},
) {
  const draft = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!draft) throw notFound("Order");
  if (paysInStore(draft))
    throw new ShopError(
      "CONFLICT",
      `This order is paid on your ${storeLabel(draft.checkoutVia)} checkout. Send its checkout link instead.`,
    );
  let priceChange: { before: number; after: number } | null = null;
  if (draft.status === "DRAFT" && draft.paymentStatus !== "PAID") {
    await assertCanTakeOrder(draft);
    const prices = await prepareDraftForPayment(orderId, { strict: !opts.acceptPriceChange });
    if (prices.changed) priceChange = { before: prices.before, after: prices.after };
  }
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { store: true },
  });
  if (!order) throw notFound("Order");
  if (order.paymentStatus === "PAID") throw new ShopError("CONFLICT", "This order is already paid");
  if (order.status === "CANCELLED") throw new ShopError("CONFLICT", "This order was cancelled");
  const total = toNumber(order.total);
  if (total <= 0) throw new ShopError("INVALID", "There is nothing to pay on this order");

  const picked = await pickProvider(order.store, opts.provider);
  if (!picked)
    throw new ShopError(
      "PAYMENT_UNAVAILABLE",
      "Connect Stripe or Razorpay in Commerce → Settings → Getting paid to take payments online",
    );

  // Held before the link exists, so a code's last use or a points balance can't back two links.
  await reserveOrderBenefits(orderId);

  const token = order.checkoutToken ?? newCheckoutToken();
  const expiresAt = new Date(Date.now() + order.store.paymentLinkTtlHours * 3_600_000);
  const link = await picked.provider.createLink(picked.credential, {
    orderId: order.id,
    orderNumber: order.number,
    storeName: order.store.name,
    amount: total,
    currency: order.currency,
    customer: { name: order.customerName, email: order.customerEmail, phone: order.customerPhone },
    returnUrl: `${checkoutUrl(token)}?paid=1`,
    cancelUrl: checkoutUrl(token),
    expiresAt,
  });

  const older = await prisma.shopPayment.findMany({
    where: { orderId, status: "PENDING", providerRef: { not: null } },
  });
  await Promise.all(older.map((payment) => closeLink(order.orgId, payment)));

  await prisma.$transaction(async (tx) => {
    await tx.shopPayment.updateMany({
      where: { orderId, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    await tx.shopPayment.create({
      data: {
        orderId,
        provider: picked.provider.id,
        status: "PENDING",
        amount: total,
        currency: order.currency,
        linkUrl: link.url,
        providerRef: link.providerRef,
        expiresAt: link.expiresAt ?? expiresAt,
      },
    });
    await tx.shopOrder.update({
      where: { id: orderId },
      data: {
        checkoutToken: token,
        checkoutExpiresAt: link.expiresAt ?? expiresAt,
        paymentStatus: "PENDING",
        checkoutStage: order.status === "DRAFT" ? "PAYMENT" : order.checkoutStage,
        paymentMethod: picked.provider.id,
      },
    });
  });
  await addOrderEvent(
    orderId,
    "payment_link",
    `Payment link created · ${picked.provider.label} · ${order.currency} ${total.toFixed(2)}`,
  );
  return {
    url: link.url,
    provider: picked.provider.id,
    amount: total,
    currency: order.currency,
    expiresAt: link.expiresAt ?? expiresAt,
    priceChange,
  };
}

/**
 * `reported` is what a webhook claimed. Any merchant can sign a webhook with their own secret,
 * so the payment is looked up only within `storeId`, and a payment or refund is asked of the
 * gateway with that store's keys rather than taken from the event.
 */
async function applyState(
  reported: ProviderPaymentState,
  provider: PaymentProvider,
  credential: PaymentAccountCredential,
  storeId: string,
  fromWebhook: boolean,
) {
  if (reported.state === "refunded") {
    const payment = await prisma.shopPayment.findFirst({
      where: { provider: provider.id, providerPaymentId: reported.paymentId, order: { storeId } },
    });
    if (!payment) return;
    const total =
      (fromWebhook ? null : reported.amountRefunded) ??
      (await provider.refundedTotal(credential, reported.paymentId));
    await recordRefund(payment.orderId, payment.id, total, null, true);
    return;
  }
  const payment = await prisma.shopPayment.findFirst({
    where: { provider: provider.id, providerRef: reported.providerRef, order: { storeId } },
  });
  if (!payment) return;
  const state =
    fromWebhook && reported.state === "paid"
      ? await provider.fetchState(credential, reported.providerRef)
      : reported;

  if (state.state === "paid") {
    if (
      (state.currency && state.currency !== payment.currency.toUpperCase()) ||
      (state.orderId && state.orderId !== payment.orderId)
    ) {
      log.warn(
        { paymentId: payment.id, currency: state.currency, orderId: state.orderId },
        "A gateway payment doesn't match the RateUp payment it names",
      );
      await addOrderEvent(
        payment.orderId,
        "payment_mismatch",
        `A ${provider.label} payment arrived that doesn't match this order (${state.currency ?? "unknown currency"}) — check it in ${provider.label}`,
        { providerRef: state.providerRef },
      );
      return;
    }
    // Claimed conditionally: the webhook and the customer's return to the checkout page
    // usually report the same payment at the same moment.
    const { count } = await prisma.shopPayment.updateMany({
      where: { id: payment.id, status: { not: "PAID" } },
      data: { status: "PAID", paidAt: new Date(), providerPaymentId: state.paymentId },
    });
    if (!count) return;

    const order = await prisma.shopOrder.findUniqueOrThrow({ where: { id: payment.orderId } });
    const paid = state.amount ?? toNumber(payment.amount);
    const due = toNumber(order.total);
    const label = `${payment.currency} ${paid.toFixed(2)}`;

    if (order.paymentStatus === "PAID") {
      await addOrderEvent(
        order.id,
        "duplicate_payment",
        `A second payment of ${label} arrived for an order already paid — refund one of them`,
        { paymentId: state.paymentId },
      );
      return;
    }
    // A link superseded by a newer one (or paid for less) does not settle the order on its own.
    if (paid < due - 0.009) {
      await addOrderEvent(
        order.id,
        "underpaid",
        `Received ${label}, but the order now comes to ${order.currency} ${due.toFixed(2)} — collect the difference or mark it paid`,
        { paymentId: state.paymentId },
      );
      return;
    }
    if (payment.status !== "PENDING") {
      await addOrderEvent(
        order.id,
        "old_link_paid",
        `Paid through an older payment link (${label})`,
        { paymentId: state.paymentId },
      );
    }
    if (paid > due + 0.009) {
      await addOrderEvent(
        order.id,
        "overpaid",
        `Received ${label} for an order of ${order.currency} ${due.toFixed(2)} — refund the difference`,
        { paymentId: state.paymentId },
      );
    }
    await markOrderPaid(payment.orderId, {
      provider: provider.id,
      paymentId: state.paymentId,
      amount: paid,
    });
  } else if (state.state === "failed" || state.state === "expired") {
    const { count } = await prisma.shopPayment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: state.state === "failed" ? "FAILED" : "EXPIRED" },
    });
    if (!count) return;
    await addOrderEvent(
      payment.orderId,
      `payment_${state.state}`,
      state.state === "failed" ? "Payment failed" : "Payment link expired",
    );
    const open = await prisma.shopPayment.count({
      where: { orderId: payment.orderId, status: "PENDING" },
    });
    if (!open) await releaseOrderBenefits(payment.orderId);
  }
}

export async function handlePaymentWebhook(
  providerId: string,
  storeId: string,
  rawBody: string,
  headers: Record<string, string | string[] | undefined>,
) {
  const provider = getPaymentProvider(providerId);
  const store = await prisma.shopStore.findUnique({ where: { id: storeId } });
  if (!store) throw notFound("Store");
  const account = await getPaymentAccount(store.orgId, provider.id);
  if (!account) throw new ShopError("PAYMENT_UNAVAILABLE", "Not connected");
  const state = provider.parseWebhook(account.credential, rawBody, headers);
  // Past the signature check, so the setup is proven whatever the event was. Hourly at most.
  const last = account.credential.lastWebhookAt ? Date.parse(account.credential.lastWebhookAt) : 0;
  if (Date.now() - last > 3_600_000) {
    await prisma.integration.update({
      where: { id: account.row.id },
      data: { credential: { ...account.credential, lastWebhookAt: new Date().toISOString() } },
    });
  }
  if (state) await applyState(state, provider, account.credential, store.id, true);
}

/**
 * Asks the gateway directly. Used when the customer comes back to the checkout page, and by
 * the reminder sweep before nudging someone who may in fact have paid.
 */
export async function refreshPendingPayment(order: Pick<ShopOrder, "id" | "orgId">) {
  const payment = await prisma.shopPayment.findFirst({
    where: { orderId: order.id, status: "PENDING", providerRef: { not: null } },
    orderBy: { createdAt: "desc" },
    include: { order: { select: { storeId: true } } },
  });
  if (!payment || !PAYMENT_PROVIDERS.some((p) => p.id === payment.provider)) return null;
  const provider = getPaymentProvider(payment.provider);
  const account = await getPaymentAccount(order.orgId, provider.id);
  if (!account) return null;
  try {
    const state = await provider.fetchState(account.credential, payment.providerRef!);
    await applyState(state, provider, account.credential, payment.order.storeId, false);
    return state.state;
  } catch (err) {
    log.warn({ err, orderId: order.id }, "Could not refresh a pending shop payment");
    return null;
  }
}

async function recordRefund(
  orderId: string,
  paymentId: string,
  amount: number,
  actorUserId: string | null,
  fromWebhook: boolean,
) {
  const payment = await prisma.shopPayment.findUniqueOrThrow({ where: { id: paymentId } });
  const refunded = fromWebhook ? amount : round2(toNumber(payment.refundedAmount) + amount);
  if (fromWebhook && refunded <= toNumber(payment.refundedAmount)) return;
  const full = refunded >= toNumber(payment.amount) - 0.009;
  await prisma.shopPayment.update({
    where: { id: paymentId },
    data: { refundedAmount: refunded, status: full ? "REFUNDED" : "PARTIALLY_REFUNDED" },
  });
  await prisma.shopOrder.update({
    where: { id: orderId },
    data: { paymentStatus: full ? "REFUNDED" : "PARTIALLY_REFUNDED" },
  });
  await addOrderEvent(
    orderId,
    "refunded",
    `Refunded ${payment.currency} ${(fromWebhook ? refunded - toNumber(payment.refundedAmount) : amount).toFixed(2)}${full ? " (full)" : ""}`,
    undefined,
    actorUserId,
  );
  if (full) {
    const { reverseEarnedPoints } = await import("../shopLoyalty.js");
    await reverseEarnedPoints(orderId, "order_refunded").catch(() => {});
  }
  await onShopOrderEvent(orderId, "refunded");
}

/** Staff refund through the gateway the order was paid with. Cash and bank refunds are recorded only. */
export async function refundOrder(
  orderId: string,
  amount: number | null,
  actorUserId: string | null,
) {
  const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!order) throw notFound("Order");
  if (inStoreCheckout(order.checkoutVia))
    throw new ShopError(
      "INVALID",
      `This order was paid in ${order.checkoutVia === "SHOPIFY" ? "Shopify" : "WooCommerce"}; refund it there`,
    );
  const payment = await prisma.shopPayment.findFirst({
    where: { orderId, status: { in: ["PAID", "PARTIALLY_REFUNDED"] } },
    orderBy: { paidAt: "desc" },
  });
  const paid = payment
    ? toNumber(payment.amount)
    : order.paymentStatus === "PAID"
      ? toNumber(order.total)
      : 0;
  const already = payment ? toNumber(payment.refundedAmount) : 0;
  const value = round2(amount ?? paid - already);
  if (!(value > 0) || value > paid - already + 0.009)
    throw new ShopError("INVALID", `You can refund up to ${(paid - already).toFixed(2)}`);

  if (
    payment &&
    payment.providerPaymentId &&
    PAYMENT_PROVIDERS.some((p) => p.id === payment.provider)
  ) {
    const provider = getPaymentProvider(payment.provider);
    const account = await getPaymentAccount(order.orgId, provider.id);
    if (!account)
      throw new ShopError("PAYMENT_UNAVAILABLE", `${provider.label} is no longer connected`);
    try {
      await provider.refund(account.credential, payment.providerPaymentId, value, payment.currency);
    } catch (err) {
      throw new ShopError(
        "PAYMENT_FAILED",
        err instanceof Error ? err.message : "The refund was refused",
      );
    }
    await recordRefund(orderId, payment.id, value, actorUserId, false);
    return;
  }
  // Paid outside a gateway (cash, bank transfer, manual): record it.
  const manual =
    payment ??
    (await prisma.shopPayment.create({
      data: {
        orderId,
        provider: order.paymentMethod ?? "manual",
        status: "PAID",
        amount: toNumber(order.total),
        currency: order.currency,
        paidAt: order.paidAt ?? new Date(),
      },
    }));
  await recordRefund(orderId, manual.id, value, actorUserId, false);
}

/** Staff marking an order paid by hand (cash in the shop, a bank transfer that arrived). */
export async function markPaidManually(orderId: string, method: string, actorUserId: string) {
  const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!order) throw notFound("Order");
  if (paysInStore(order))
    throw new ShopError(
      "CONFLICT",
      `This order is paid in ${storeLabel(order.checkoutVia)}. Mark it paid there and RateUp follows.`,
    );
  // A second PAID row would be the one a later refund picks, and it would be recorded as
  // cash instead of going back through the gateway.
  if (
    order.status === "CANCELLED" ||
    ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(order.paymentStatus)
  )
    throw new ShopError("INVALID", "This order isn't waiting for payment");
  await prisma.shopPayment.create({
    data: {
      orderId,
      provider: method,
      status: "PAID",
      amount: toNumber(order.total),
      currency: order.currency,
      paidAt: new Date(),
    },
  });
  return markOrderPaid(orderId, { provider: method, actorUserId });
}
