import type { ShopChannel } from "../../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { parsePhoneforWa } from "../../loyalty/util.js";
import {
  armShopReminder,
  enqueueBackInStock,
  type ShopReminderKind,
} from "../../../workers/bullmq/queues/shop.queue.js";
import { chatAttribution } from "./attribution.js";
import { checkoutUrl, storefrontUrl } from "./events.js";
import { notificationSetting, sendShopMessage } from "./notify.js";
import { addOrderEvent, cancelOrder } from "./orders.service.js";
import { refreshPendingPayment } from "./payments/payments.service.js";
import { toNumber } from "./pricing.js";
import { customerReachable, startPhoneVerification } from "./phoneVerify.service.js";
import { ShopError } from "./shop.errors.js";
import { commerceEnabled } from "./store.service.js";
import { inStoreCheckout } from "./checkoutVia.js";

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
    // Re-checked under the row lock: a confirm landing as the deadline fires must win.
    const after = await cancelOrder(order.id, {
      reason: "Not confirmed in time",
      onlyIf: { paymentStatus: "COD_PENDING", confirmedAt: null, status: "OPEN" },
    });
    return after.status === "CANCELLED" ? "cancelled" : "skipped";
  }

  if (kind === "bank_expire") {
    if (
      order.paymentMethod !== "bank" ||
      order.status !== "OPEN" ||
      ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(order.paymentStatus)
    )
      return "skipped";
    const after = await cancelOrder(order.id, {
      reason: "Transfer not received in time",
      onlyIf: {
        status: "OPEN",
        paymentStatus: { notIn: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] },
      },
    });
    return after.status === "CANCELLED" ? "cancelled" : "skipped";
  }

  if (!customerReachable(order)) return "skipped";

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
  // An expired draft can't be paid any more, so nudging the customer to finish it only costs.
  if (order.status === "DRAFT" && order.checkoutExpiresAt && order.checkoutExpiresAt < new Date())
    return "expired";

  // A store checkout's cart and payment follow-ups are the store's own.
  if ((kind === "payment" || kind === "cart") && inStoreCheckout(order.checkoutVia))
    return "skipped";

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
  if (order.status !== "DRAFT" || !order.checkoutToken) return "skipped";
  const last = step === (order.store.cartReminderMinutes?.length ?? 1) - 1;
  const discount =
    last && order.store.cartReminderDiscountId
      ? await prisma.shopDiscount.findFirst({
          where: { id: order.store.cartReminderDiscountId, storeId: order.storeId },
        })
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
      cta: { label: "Finish checkout", url: checkoutUrl(order.checkoutToken) },
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
    // Claimed before sending, so a second job running over the same rows skips this one.
    const { count } = await prisma.shopBackInStockRequest.updateMany({
      where: { id: r.id, notifiedAt: null },
      data: { notifiedAt: new Date() },
    });
    if (!count) continue;
    const name = product.title + (variant.title !== "Default" ? ` (${variant.title})` : "");
    const outcome = await sendShopMessage(
      { orgId: store.orgId, channel: r.channel, contactId: r.contactId },
      {
        text: `Good news — ${name} is back in stock at ${store.name}.`,
        buttons: [{ id: `shop_buy:${variant.id}:1:bis`, title: "Buy now" }],
        templateParams: [name, store.name],
      },
      setting.waTemplateId,
    );
    if (outcome.sent) sent++;
  }
  return { sent, total: requests.length };
}

/** Waiting requests one contact may hold at a store. */
const MAX_WAITING_PER_CONTACT = 20;
/** A number told about a restock is not signed up again (and told again) for this long. */
const RENOTIFY_AFTER_MS = 7 * 86_400_000;

async function waitableVariant(storeId: string, variantId: string, opts: { storefront?: boolean }) {
  const variant = await prisma.shopVariant.findFirst({
    where: {
      id: variantId,
      storeId,
      product: { status: "ACTIVE", ...(opts.storefront ? { showOnStorefront: true } : {}) },
    },
    include: { product: { select: { orgId: true, title: true } } },
  });
  if (!variant) throw new ShopError("NOT_FOUND", "Product not found");
  if (!variant.trackInventory || variant.stock > 0 || variant.allowBackorder)
    throw new ShopError("INVALID", "This is in stock now");
  return variant;
}

const variantName = (v: { title: string; product: { title: string } }) =>
  v.product.title + (v.title !== "Default" ? ` (${v.title})` : "");

/**
 * A customer we can already reach asks to hear when a sold-out variant returns: from chat, the
 * AI agent, or a storefront visitor once their number is proven on WhatsApp.
 */
export async function subscribeBackInStock(input: {
  storeId: string;
  variantId: string;
  contactId?: string | null;
  phone?: string | null;
  channel?: ShopChannel;
}) {
  const variant = await waitableVariant(input.storeId, input.variantId, {});
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
  const name = variantName(variant);
  const listed = {
    ok: true as const,
    message: `You're on the list. We'll message you here when ${name} is back.`,
  };
  const existing = await prisma.shopBackInStockRequest.findUnique({
    where: { variantId_contactId: { variantId: variant.id, contactId } },
  });
  if (
    existing &&
    (!existing.notifiedAt || Date.now() - existing.notifiedAt.getTime() < RENOTIFY_AFTER_MS)
  )
    return listed;
  if (!existing) {
    const waiting = await prisma.shopBackInStockRequest.count({
      where: { contactId, notifiedAt: null, variant: { storeId: input.storeId } },
    });
    if (waiting >= MAX_WAITING_PER_CONTACT)
      throw new ShopError(
        "LIMIT_REACHED",
        `You're already waiting for ${waiting} products here. We'll tell you as they come back.`,
      );
  }
  await prisma.shopBackInStockRequest.upsert({
    where: { variantId_contactId: { variantId: variant.id, contactId } },
    create: { variantId: variant.id, contactId, channel: input.channel ?? "WHATSAPP" },
    update: { notifiedAt: null },
  });
  return listed;
}

/**
 * A storefront visitor asks to be told about a restock. Nothing is stored against a number
 * until they send the code from their own WhatsApp; that message is also what lets the store
 * answer them later.
 */
export async function requestBackInStockFromStorefront(
  store: { id: string; orgId: string },
  variantId: string,
  ip?: string | null,
) {
  const variant = await waitableVariant(store.id, variantId, { storefront: true });
  return startPhoneVerification({
    store,
    ip,
    purpose: "back_in_stock",
    variantId: variant.id,
    prompt: `Tell me when ${variantName(variant)} is back in stock.`,
  });
}

const DM_SOURCE: Record<ShopChannel, string> = {
  WHATSAPP: "wa_dm",
  INSTAGRAM: "ig_dm",
  MESSENGER: "messenger_dm",
  STOREFRONT: "storefront",
  MANUAL: "manual",
};

/**
 * "Buy now" on a back-in-stock message or a product card: a one-item cart, then the usual chat
 * checkout. A comment or ad that brought the customer names the source; otherwise the button does.
 */
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
  origin?: "back_in_stock",
) {
  const store = await prisma.shopStore.findUnique({ where: { orgId: from.orgId } });
  if (!store || !(await commerceEnabled(store.orgId))) return false;
  const attribution = from.contactId ? await chatAttribution(from.orgId, from.contactId) : null;
  const social = attribution?.kind === "ig_comment" || attribution?.kind === "ig_story";
  const { createDraftOrder } = await import("./orders.service.js");
  const { continueChatCheckout } = await import("./checkout.service.js");
  try {
    // Tapping Buy now again picks the same checkout back up: a fresh draft per tap would arm
    // a fresh set of paid reminders each time.
    const open = from.contactId
      ? await prisma.shopOrder.findFirst({
          where: {
            storeId: store.id,
            contactId: from.contactId,
            status: "DRAFT",
            checkoutExpiresAt: { gt: new Date() },
            items: { some: { variantId } },
          },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        })
      : null;
    if (open) {
      await continueChatCheckout(open.id);
      return true;
    }
    const order = await createDraftOrder({
      store,
      items: [{ variantId, quantity }],
      channel: from.channel,
      source: origin ?? (social ? attribution.kind : DM_SOURCE[from.channel]),
      contactId: from.contactId,
      channelAccountId: from.channelAccountId,
      customer: { phone: from.phone ?? null },
      attribution,
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
      { text: await buyNowFailure(err, variantId, store) },
    );
  }
  return true;
}

/** Tells the customer what actually went wrong, so "sold out" is only said when it is. */
async function buyNowFailure(err: unknown, variantId: string, store: { slug: string }) {
  const shop = storefrontUrl(store.slug);
  const variant = await prisma.shopVariant.findUnique({
    where: { id: variantId },
    select: {
      stock: true,
      trackInventory: true,
      allowBackorder: true,
      product: { select: { status: true } },
    },
  });
  if (!variant || variant.product.status !== "ACTIVE")
    return `Sorry, that's no longer available. Visit ${shop} to see what else we have.`;
  const soldOut =
    (err instanceof ShopError && err.code === "OUT_OF_STOCK") ||
    (variant.trackInventory && !variant.allowBackorder && variant.stock < 1);
  if (soldOut) return `Sorry, that just sold out. Visit ${shop} to see what's in stock.`;
  return "Sorry, checkout isn't available right now. Reply here and we'll help you order.";
}
