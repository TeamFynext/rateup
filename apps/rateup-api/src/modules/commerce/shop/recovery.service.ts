import type { ShopChannel } from "../../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { parsePhoneforWa } from "../../loyalty/util.js";
import {
  armShopReminder,
  enqueueBackInStock,
  type ShopReminderKind,
} from "../../../workers/bullmq/queues/shop.queue.js";
import { checkoutUrl, storefrontUrl } from "./events.js";
import { notificationSetting, sendShopMessage } from "./notify.js";
import { addOrderEvent, cancelOrder } from "./orders.service.js";
import { refreshPendingPayment } from "./payments/payments.service.js";
import { toNumber } from "./pricing.js";
import { ShopError } from "./shop.errors.js";

/**
 * Everything that brings a customer back: cart and payment reminders, the cash-order
 * confirmation deadline, back-in-stock alerts and the review request after delivery. Every
 * handler re-reads the order and stops if the moment has passed (paid, cancelled, delivered).
 */

export async function fireShopReminder(orderId: string, kind: ShopReminderKind, step: number) {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { store: true, items: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!order) return "missing";

  const recipient = {
    orgId: order.orgId,
    channel: order.channel,
    channelAccountId: order.channelAccountId,
    contactId: order.contactId,
    phone: order.customerPhone,
  };
  const items = order.items.reduce((s, i) => s + i.quantity, 0);

  if (kind === "cod_expire") {
    if (order.paymentStatus !== "COD_PENDING" || order.confirmedAt || order.status === "CANCELLED")
      return "skipped";
    await cancelOrder(order.id, { reason: "Not confirmed in time" });
    return "cancelled";
  }

  if (kind === "review") {
    if (order.fulfillmentStatus !== "DELIVERED") return "skipped";
    const setting = notificationSetting(order.store.notifications, "review_request");
    const on =
      (order.store.notifications as Record<string, { enabled?: boolean }> | null)?.review_request
        ?.enabled ?? true;
    if (!on) return "disabled";
    const first = order.items[0];
    await sendShopMessage(
      recipient,
      {
        text: `How was your ${first ? first.title : "order"}? Tap to tell us — it takes a second.`,
        buttons: [
          { id: `shop_review:${order.id}:5`, title: "Loved it" },
          { id: `shop_review:${order.id}:3`, title: "It was okay" },
          { id: `shop_review:${order.id}:1`, title: "Not happy" },
        ],
        templateParams: [order.customerName?.split(" ")[0] ?? "there", `#${order.number}`],
      },
      setting.waTemplateId,
    );
    await addOrderEvent(order.id, "review_request", "Review request sent");
    return "sent";
  }

  if (order.status === "CANCELLED" || order.paymentStatus === "PAID") return "skipped";

  // Ask the gateway first: someone who paid a minute ago must not get "you forgot to pay".
  const state = await refreshPendingPayment(order);
  if (state === "paid") return "paid";

  if (kind === "payment") {
    const link = order.payments[0];
    if (!link || link.status !== "PENDING" || !link.linkUrl) return "skipped";
    const setting = notificationSetting(order.store.notifications, "payment_reminder");
    const outcome = await sendShopMessage(
      recipient,
      {
        text: `Your order #${order.number} (${order.currency} ${toNumber(order.total).toFixed(2)}) is waiting for payment. The link is still open.`,
        cta: { label: "Pay now", url: link.linkUrl },
        templateParams: [order.customerName?.split(" ")[0] ?? "there", `#${order.number}`],
      },
      setting.waTemplateId,
    );
    await recordReminder(order.id, "payment", outcome.sent);
    return outcome.sent ? "sent" : "not_sent";
  }

  // cart
  if (order.status !== "DRAFT") return "skipped";
  const last = step === (order.store.cartReminderMinutes?.length ?? 1) - 1;
  const discount =
    last && order.store.cartReminderDiscountId
      ? await prisma.shopDiscount.findUnique({ where: { id: order.store.cartReminderDiscountId } })
      : null;
  const setting = notificationSetting(order.store.notifications, "cart_reminder");
  const outcome = await sendShopMessage(
    recipient,
    {
      text:
        `You left ${items} item${items === 1 ? "" : "s"} in your cart at ${order.store.name}.` +
        (discount?.active
          ? ` Use code ${discount.code} at checkout for a little extra off.`
          : " They're still saved for you."),
      cta: { label: "Finish checkout", url: checkoutUrl(order.checkoutToken!) },
      templateParams: [order.customerName?.split(" ")[0] ?? "there", order.store.name],
    },
    setting.waTemplateId,
  );
  await recordReminder(order.id, `cart ${step + 1}`, outcome.sent);
  return outcome.sent ? "sent" : "not_sent";
}

async function recordReminder(orderId: string, what: string, sent: boolean) {
  await prisma.shopOrder.update({
    where: { id: orderId },
    data: {
      reminderCount: { increment: sent ? 1 : 0 },
      lastReminderAt: sent ? new Date() : undefined,
    },
  });
  await addOrderEvent(
    orderId,
    "reminder",
    sent
      ? `Reminder sent (${what})`
      : `Reminder not sent (${what}): the customer can't be reached right now`,
  );
}

/** Two days after delivery, unless the store turned review requests off. */
export async function armReviewRequest(orderId: string) {
  await armShopReminder(orderId, "review", 0, new Date(Date.now() + 2 * 86_400_000));
}

export async function recordReview(orderId: string, rating: number) {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { store: true },
  });
  if (!order) return;
  await addOrderEvent(orderId, "review", `Customer rated the order ${rating}/5`, { rating });
  const text =
    rating >= 4
      ? "Thank you — that made our day!"
      : "Sorry it wasn't great. Reply here and tell us what happened; we'll make it right.";
  await sendShopMessage(
    {
      orgId: order.orgId,
      channel: order.channel,
      channelAccountId: order.channelAccountId,
      contactId: order.contactId,
      phone: order.customerPhone,
    },
    { text },
  );
}

// ─── Back in stock ───────────────────────────────────────────────────────────

export async function notifyBackInStock(variantId: string) {
  const waiting = await prisma.shopBackInStockRequest.count({
    where: { variantId, notifiedAt: null },
  });
  if (waiting) await enqueueBackInStock(variantId);
}

/** Worker: tells everyone waiting, oldest first, while there is stock to sell them. */
export async function runBackInStock(variantId: string) {
  const variant = await prisma.shopVariant.findUnique({
    where: { id: variantId },
    include: { product: { include: { store: true } } },
  });
  if (!variant || (variant.trackInventory && variant.stock <= 0)) return { sent: 0 };
  const { product } = variant;
  const store = product.store;
  if (product.status !== "ACTIVE") return { sent: 0 };
  const setting = notificationSetting(store.notifications, "back_in_stock");
  const requests = await prisma.shopBackInStockRequest.findMany({
    where: { variantId, notifiedAt: null },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  let sent = 0;
  for (const r of requests) {
    const name = product.title + (variant.title !== "Default" ? ` (${variant.title})` : "");
    const outcome = await sendShopMessage(
      { orgId: store.orgId, channel: r.channel, contactId: r.contactId },
      {
        text: `Good news — ${name} is back in stock at ${store.name}.`,
        buttons: [{ id: `shop_buy:${variant.id}:1`, title: "Buy now" }],
        templateParams: [name, store.name],
      },
      setting.waTemplateId,
    );
    await prisma.shopBackInStockRequest.update({
      where: { id: r.id },
      data: { notifiedAt: new Date() },
    });
    if (outcome.sent) sent++;
  }
  return { sent, total: requests.length };
}

/** A customer asks to hear when a sold-out variant returns, from the storefront or chat. */
export async function subscribeBackInStock(input: {
  storeId: string;
  variantId: string;
  contactId?: string | null;
  phone?: string | null;
  channel?: ShopChannel;
}) {
  const variant = await prisma.shopVariant.findFirst({
    where: { id: input.variantId, storeId: input.storeId },
    include: { product: { select: { orgId: true } } },
  });
  if (!variant) throw new ShopError("NOT_FOUND", "Product not found");
  let contactId = input.contactId ?? null;
  if (!contactId) {
    const phone = input.phone ? parsePhoneforWa(input.phone.replace(/[^\d+]/g, "")) : null;
    if (!phone || phone.length < 7) throw new ShopError("INVALID", "Enter your WhatsApp number");
    const contact = await prisma.contact.upsert({
      where: { contact_phone_org_id_unique: { phone, orgId: variant.product.orgId } },
      create: { phone, orgId: variant.product.orgId, source: "storefront" },
      update: {},
      select: { id: true },
    });
    contactId = contact.id;
  }
  await prisma.shopBackInStockRequest.upsert({
    where: { variantId_contactId: { variantId: variant.id, contactId } },
    create: { variantId: variant.id, contactId, channel: input.channel ?? "WHATSAPP" },
    update: { notifiedAt: null },
  });
  return { ok: true };
}

/** "Buy now" on a back-in-stock message: a one-item cart, then the usual chat checkout. */
export async function buyNowFromChat(
  variantId: string,
  quantity: number,
  from: {
    orgId: string;
    contactId: string | null;
    channel: ShopChannel;
    channelAccountId?: string | null;
    phone?: string | null;
  },
) {
  const store = await prisma.shopStore.findUnique({ where: { orgId: from.orgId } });
  if (!store) return false;
  const { createDraftOrder } = await import("./orders.service.js");
  const { continueChatCheckout } = await import("./checkout.service.js");
  try {
    const order = await createDraftOrder({
      store,
      items: [{ variantId, quantity }],
      channel: from.channel,
      source: "back_in_stock",
      contactId: from.contactId,
      channelAccountId: from.channelAccountId,
      customer: { phone: from.phone ?? null },
    });
    await continueChatCheckout(order.id);
  } catch (err) {
    log.warn({ err, variantId }, "Buy now from chat failed");
    await sendShopMessage(
      {
        orgId: from.orgId,
        channel: from.channel,
        channelAccountId: from.channelAccountId,
        contactId: from.contactId,
        phone: from.phone,
      },
      {
        text: `Sorry, that sold out again. Visit ${storefrontUrl(store.slug)} to see what's in stock.`,
      },
    );
  }
  return true;
}
