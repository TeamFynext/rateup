import type { ShopChannel, ShopOrder, ShopStore } from "../../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { armShopReminder } from "../../../workers/bullmq/queues/shop.queue.js";
import { sendAddressFlowToCustomer } from "../../whatsapp/catalog/catalogSettings.service.js";
import { checkoutUrl } from "./events.js";
import { sendShopMessage, type ShopMessage } from "./notify.js";
import {
  addOrderEvent,
  cancelOrder,
  confirmCodOrder,
  createDraftOrder,
  getOrderByToken,
  orderDetailInclude,
  placeOrder,
  repriceOrder,
  type CartLineInput,
  type CheckoutPatch,
} from "./orders.service.js";
import {
  createPaymentLink,
  pickProvider,
  refreshPendingPayment,
} from "./payments/payments.service.js";
import { toNumber } from "./pricing.js";
import { ShopError } from "./shop.errors.js";
import { pointsOffer } from "./shopLoyalty.js";
import type { ShopAddress, ShopAttribution } from "./shop.types.js";
import { getOrCreateStore, ratesForDestination } from "./store.service.js";

/**
 * Checkout in two places that share one order:
 *
 * - **In chat** (WhatsApp): address form → delivery list → points → pay, one message at a time.
 *   Reply ids carry the order id (`shop_ship:<orderId>:<rateId>`), so a reply is never
 *   applied to the wrong cart even when the customer has two open.
 * - **The hosted page** `/c/<token>`: everything on one page. Instagram, Messenger and the
 *   storefront use it, and WhatsApp falls back to it when a step can't be done in chat.
 */

const money = (o: Pick<ShopOrder, "currency">, n: unknown) =>
  `${o.currency} ${toNumber(n as number).toFixed(2)}`;

type OrderForChat = ShopOrder & { store: ShopStore };

async function loadForChat(orderId: string): Promise<OrderForChat> {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { store: true },
  });
  if (!order) throw new ShopError("NOT_FOUND", "Order not found");
  return order;
}

function send(order: OrderForChat, message: ShopMessage) {
  return sendShopMessage(
    {
      orgId: order.orgId,
      channel: order.channel,
      channelAccountId: order.channelAccountId,
      contactId: order.contactId,
      phone: order.customerPhone,
    },
    message,
  );
}

/** Starts (or resumes) the checkout conversation for a draft order. */
export async function continueChatCheckout(orderId: string) {
  const order = await loadForChat(orderId);
  if (order.status !== "DRAFT") return;
  const { store } = order;

  // Instagram and Messenger have no address form or native list: the hosted page does it all.
  if (order.channel !== "WHATSAPP") return sendCheckoutLink(order);

  if (order.checkoutStage === "ADDRESS") {
    if (store.askAddress && !order.shippingAddress) {
      const catalog = store.metaCatalogId
        ? await prisma.whatsappCatalog.findUnique({
            where: { catalogId: store.metaCatalogId },
            select: { addressFlowId: true, addressFlowStatus: true },
          })
        : null;
      if (
        catalog?.addressFlowId &&
        catalog.addressFlowStatus === "approved" &&
        order.customerPhone
      ) {
        await sendAddressFlowToCustomer({
          orgId: order.orgId,
          phone: order.customerPhone,
          orderId: `shop:${order.id}`,
          waFlowId: catalog.addressFlowId,
          whatsappSettingsPhoneId: order.channelAccountId ?? undefined,
        });
        await armCartReminders(order);
        return;
      }
      // No approved address form: the page collects the address and the rest.
      return sendCheckoutLink(order);
    }
    await setStage(order.id, "DELIVERY");
    return continueChatCheckout(orderId);
  }

  if (order.checkoutStage === "DELIVERY") {
    const address = order.shippingAddress as ShopAddress | null;
    const rates = store.askDelivery ? await ratesForDestination(store.id, address?.country) : [];
    if (rates.length > 1 && !order.shippingRate) {
      const subtotal = toNumber(order.subtotal);
      await send(order, {
        text: `How would you like order #${order.number} delivered?`,
        list: {
          button: "Delivery options",
          rows: rates.slice(0, 10).map((r) => {
            const free = r.freeOver !== null && subtotal >= toNumber(r.freeOver);
            const days = r.minDays
              ? ` · ${r.minDays}${r.maxDays && r.maxDays !== r.minDays ? `–${r.maxDays}` : ""} days`
              : "";
            return {
              id: `shop_ship:${order.id}:${r.id}`,
              title: r.name.slice(0, 24),
              description: `${free ? "Free" : money(order, r.price)}${days}`.slice(0, 72),
            };
          }),
        },
      });
      await armCartReminders(order);
      return;
    }
    await repriceOrder(order.id, rates.length === 1 ? { shippingRateId: rates[0].id } : {});
    await setStage(order.id, "LOYALTY");
    return continueChatCheckout(orderId);
  }

  if (order.checkoutStage === "LOYALTY") {
    const goods = toNumber(order.subtotal) - toNumber(order.discountTotal);
    const offer =
      order.pointsRedeemed > 0 ? null : await pointsOffer(store, order.contactId, goods);
    await setStage(order.id, "PAYMENT");
    if (offer && offer.points > 0) {
      await send(order, {
        text: `You have ${offer.balance} ${offer.currencyName.toLowerCase()}. Use ${offer.points} for ${money(order, offer.value)} off this order?`,
        buttons: [
          { id: `shop_points:${order.id}:yes`, title: `Yes, use ${offer.points}`.slice(0, 20) },
          { id: `shop_points:${order.id}:no`, title: "Not this time" },
        ],
      });
      return;
    }
    return continueChatCheckout(orderId);
  }

  if (order.checkoutStage === "PAYMENT") return askForPayment(order);
}

async function setStage(orderId: string, stage: ShopOrder["checkoutStage"]) {
  await prisma.shopOrder.update({ where: { id: orderId }, data: { checkoutStage: stage } });
}

function summary(
  order: ShopOrder & {
    items?: { title: string; variantTitle: string | null; quantity: number; lineTotal: unknown }[];
  },
) {
  const lines = (order.items ?? []).map(
    (i) =>
      `• ${i.title}${i.variantTitle ? ` (${i.variantTitle})` : ""} ×${i.quantity} — ${money(order, i.lineTotal)}`,
  );
  const extra = [
    toNumber(order.discountTotal) > 0 &&
      `Coupon ${order.discountCode ?? ""}: −${money(order, order.discountTotal)}`,
    toNumber(order.pointsDiscount) > 0 && `Points: −${money(order, order.pointsDiscount)}`,
    toNumber(order.shippingTotal) > 0 && `Delivery: ${money(order, order.shippingTotal)}`,
    toNumber(order.taxTotal) > 0 && `Tax: ${money(order, order.taxTotal)}`,
  ].filter(Boolean);
  return [`Order #${order.number}`, ...lines, ...extra, `Total: ${money(order, order.total)}`].join(
    "\n",
  );
}

async function askForPayment(order: OrderForChat) {
  const full = await prisma.shopOrder.findUniqueOrThrow({
    where: { id: order.id },
    include: { items: true },
  });
  const online = await pickProvider(order.store);
  const offline = [
    order.store.codEnabled && { id: `shop_pay:${order.id}:cod`, title: "Cash on delivery" },
    order.store.bankTransferEnabled && { id: `shop_pay:${order.id}:bank`, title: "Bank transfer" },
  ].filter(Boolean) as { id: string; title: string }[];

  if (online && !offline.length) return sendPaymentLink(order.id);
  if (!online && !offline.length) {
    await addOrderEvent(
      order.id,
      "payment_unavailable",
      "No way to take payment is set up — reply to the customer by hand",
    );
    return send(order, {
      text: `${summary(full)}\n\nThanks! Our team will message you shortly to arrange payment.`,
    });
  }
  const buttons = [
    ...(online ? [{ id: `shop_pay:${order.id}:online`, title: "Pay online" }] : []),
    ...offline,
  ];
  await send(order, {
    text: `${summary(full)}\n\nHow would you like to pay?`,
    buttons: buttons.slice(0, 3),
  });
  await armCartReminders(order);
}

export async function sendPaymentLink(
  orderId: string,
  opts: { provider?: string; actorUserId?: string } = {},
) {
  const order = await loadForChat(orderId);
  const link = await createPaymentLink(orderId, { provider: opts.provider });
  const full = await prisma.shopOrder.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  });
  const outcome = await send(order, {
    text: `${summary(full)}\n\nPay securely by card or wallet. The link is valid for ${order.store.paymentLinkTtlHours} hours.`,
    cta: { label: `Pay ${money(order, link.amount)}`, url: link.url },
  });
  await armPaymentReminders(order);
  return { ...link, delivered: outcome.sent, deliveryError: outcome.sent ? null : outcome.reason };
}

/** The hosted page: address, delivery, coupon, points and payment in one place. */
export async function sendCheckoutLink(order: OrderForChat) {
  const token = order.checkoutToken!;
  const full = await prisma.shopOrder.findUniqueOrThrow({
    where: { id: order.id },
    include: { items: true },
  });
  const outcome = await send(order, {
    text: `${summary(full)}\n\nAdd your delivery details and pay on this secure page — it takes about a minute.`,
    cta: { label: "Checkout", url: checkoutUrl(token) },
  });
  await armCartReminders(order);
  return outcome;
}

async function armCartReminders(order: ShopOrder & { store: ShopStore }) {
  const steps = order.store.cartReminderMinutes ?? [];
  const start = order.createdAt.getTime();
  await Promise.all(
    steps.map((minutes, step) =>
      armShopReminder(order.id, "cart", step, new Date(start + minutes * 60_000)),
    ),
  );
}

async function armPaymentReminders(order: ShopOrder & { store: ShopStore }) {
  // One nudge an hour after the link, while it is still valid.
  await armShopReminder(order.id, "payment", 0, new Date(Date.now() + 60 * 60_000));
}

// ─── Inbound: a cart from a catalog, and the replies to our checkout messages ───

/** Who sent a message, in the shapes the channels give us. */
export interface InboundCustomer {
  orgId: string;
  channel: ShopChannel;
  channelAccountId?: string | null;
  contactId: string | null;
  phone?: string | null;
  name?: string | null;
  attribution?: ShopAttribution | null;
}

/**
 * A cart sent from the WhatsApp catalog. Returns null when none of its items are RateUp shop
 * products, so the caller can hand it to the older catalog-only flow instead.
 */
export async function startCheckoutFromCart(customer: InboundCustomer, items: CartLineInput[]) {
  const store = await prisma.shopStore.findUnique({ where: { orgId: customer.orgId } });
  if (!store) return null;
  const known = await prisma.shopVariant.count({
    where: {
      storeId: store.id,
      retailerId: { in: items.map((i) => i.retailerId!).filter(Boolean) },
    },
  });
  if (!known) return null;
  const order = await createDraftOrder({
    store,
    items,
    channel: customer.channel,
    source: customer.channel === "WHATSAPP" ? "wa_cart" : "ig_dm",
    contactId: customer.contactId,
    channelAccountId: customer.channelAccountId,
    customer: { name: customer.name, phone: customer.phone },
    attribution: customer.attribution,
  });
  await continueChatCheckout(order.id);
  return order;
}

/** Address submitted through the WhatsApp address form (flow token `shop:<orderId>`). */
export async function handleShopAddressFlow(orderId: string, data: Record<string, string>) {
  const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "DRAFT") return false;
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || data.name;
  const address: ShopAddress = {
    name,
    phone: data.phone,
    line1: data.address1 ?? data.address,
    line2: data.address2,
    city: data.city,
    region: data.province ?? data.state,
    postalCode: data.zip ?? data.pincode ?? data.postal_code,
    country: (data.country_code ?? data.country)?.toUpperCase(),
  };
  await repriceOrder(orderId, { shippingAddress: address, customer: { name } });
  await setStage(orderId, "DELIVERY");
  await addOrderEvent(orderId, "address", "Address shared through the WhatsApp form");
  await continueChatCheckout(orderId);
  return true;
}

/**
 * Button and list replies whose ids start `shop_`. Returns true when handled. The order must
 * belong to the contact who replied; anything else is ignored.
 */
export async function handleShopReply(
  replyId: string,
  from: {
    orgId: string;
    contactId: string | null;
    channel: ShopChannel;
    channelAccountId?: string | null;
    phone?: string | null;
  },
) {
  if (!replyId.startsWith("shop_")) return false;
  const [kind, orderId, arg] = replyId.split(":");
  if (!orderId) return false;
  if (kind === "shop_buy") {
    const { buyNowFromChat } = await import("./recovery.service.js");
    return buyNowFromChat(orderId, Number(arg) || 1, from);
  }
  const order = await prisma.shopOrder.findFirst({
    where: {
      id: orderId,
      orgId: from.orgId,
      ...(from.contactId ? { contactId: from.contactId } : {}),
    },
    include: { store: true },
  });
  if (!order) return true;

  try {
    switch (kind) {
      case "shop_ship": {
        if (order.status !== "DRAFT") return true;
        await repriceOrder(order.id, { shippingRateId: arg });
        await setStage(order.id, "LOYALTY");
        await addOrderEvent(order.id, "delivery", "Delivery option picked in chat");
        await continueChatCheckout(order.id);
        return true;
      }
      case "shop_points": {
        if (order.status !== "DRAFT") return true;
        if (arg === "yes") {
          await repriceOrder(order.id, { usePoints: true });
          await addOrderEvent(order.id, "points", "Customer chose to use points");
        }
        await setStage(order.id, "PAYMENT");
        await continueChatCheckout(order.id);
        return true;
      }
      case "shop_pay": {
        if (order.status !== "DRAFT") return true;
        if (arg === "online") await sendPaymentLink(order.id);
        if (arg === "cod" && order.store.codEnabled) {
          await placeOrder(order.id, { paymentMethod: "cod", codPending: true });
        }
        if (arg === "bank" && order.store.bankTransferEnabled) {
          await placeOrder(order.id, { paymentMethod: "bank" });
        }
        return true;
      }
      case "shop_cod_confirm":
        await confirmCodOrder(order.id);
        return true;
      case "shop_cod_cancel":
        await cancelOrder(order.id, { reason: "Customer cancelled the cash order" });
        return true;
      case "shop_cod_prepay": {
        const pct = toNumber(order.store.codPrepaidDiscountPct);
        if (order.paymentStatus !== "COD_PENDING" || pct <= 0) return true;
        await convertCodToPrepaid(order.id, pct);
        return true;
      }
      case "shop_review": {
        const { recordReview } = await import("./recovery.service.js");
        await recordReview(order.id, Number(arg) || 0);
        return true;
      }
      default:
        return false;
    }
  } catch (err) {
    const message = err instanceof ShopError ? err.message : "Something went wrong with that step";
    log.warn({ err, replyId }, "Shop reply failed");
    await send(order, { text: `${message}. Reply here and we'll sort it out.` }).catch(() => {});
    return true;
  }
}

/**
 * The cash order becomes a prepaid one at a discount: a payment link for the lower amount.
 * The discount is stored on the order so the link and the invoice agree.
 */
async function convertCodToPrepaid(orderId: string, pct: number) {
  const order = await prisma.shopOrder.findUniqueOrThrow({ where: { id: orderId } });
  const off = Math.round(toNumber(order.total) * pct) / 100;
  await prisma.shopOrder.update({
    where: { id: orderId },
    data: {
      discountTotal: toNumber(order.discountTotal) + off,
      total: toNumber(order.total) - off,
      paymentStatus: "PENDING",
      confirmedAt: new Date(),
    },
  });
  await addOrderEvent(
    orderId,
    "cod_prepaid",
    `Switched to paying online for ${pct}% off (−${money(order, off)})`,
  );
  await sendPaymentLink(orderId);
}

// ─── The hosted checkout page ────────────────────────────────────────────────

export async function getPublicCheckout(token: string, opts: { justPaid?: boolean } = {}) {
  let order = await getOrderByToken(token);
  if (opts.justPaid && order.paymentStatus !== "PAID") {
    await refreshPendingPayment(order);
    order = await getOrderByToken(token);
  }
  const store = await prisma.shopStore.findUniqueOrThrow({ where: { id: order.storeId } });
  const address = order.shippingAddress as ShopAddress | null;
  const [rates, online, offer] = await Promise.all([
    ratesForDestination(store.id, address?.country),
    pickProvider(store),
    order.status === "DRAFT"
      ? pointsOffer(
          store,
          order.contactId,
          toNumber(order.subtotal) - toNumber(order.discountTotal) + toNumber(order.pointsDiscount),
        )
      : null,
  ]);
  const subtotal = toNumber(order.subtotal);
  return {
    store: {
      name: store.name,
      slug: store.slug,
      logoUrl: store.logoUrl,
      currency: store.currency,
      allowCoupons: store.allowCoupons,
      askAddress: store.askAddress,
      storefrontEnabled: store.storefrontEnabled,
      pricesIncludeTax: store.pricesIncludeTax,
    },
    order: publicOrder(order),
    // Shown until the transfer arrives, so a reload does not lose them.
    bankDetails:
      order.paymentMethod === "bank" && order.paymentStatus !== "PAID"
        ? (store.bankDetails ?? null)
        : null,
    shippingRates: rates.map((r) => ({
      id: r.id,
      name: r.name,
      zone: r.zone,
      minDays: r.minDays,
      maxDays: r.maxDays,
      price: r.freeOver !== null && subtotal >= toNumber(r.freeOver) ? 0 : toNumber(r.price),
    })),
    points: offer,
    paymentOptions: {
      online: online ? { provider: online.provider.id, label: online.provider.label } : null,
      cod: store.codEnabled,
      bank: store.bankTransferEnabled,
    },
  };
}

/** What the customer may see of their order: no staff notes, no internal ids beyond the order's. */
function publicOrder(order: Awaited<ReturnType<typeof getOrderByToken>>) {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    paymentMethod: order.paymentMethod,
    currency: order.currency,
    subtotal: toNumber(order.subtotal),
    discountTotal: toNumber(order.discountTotal),
    discountCode: order.discountCode,
    pointsDiscount: toNumber(order.pointsDiscount),
    pointsRedeemed: order.pointsRedeemed,
    shippingTotal: toNumber(order.shippingTotal),
    taxTotal: toNumber(order.taxTotal),
    total: toNumber(order.total),
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    shippingAddress: order.shippingAddress,
    shippingRate: order.shippingRate,
    channel: order.channel,
    items: order.items.map((i) => ({
      id: i.id,
      title: i.title,
      variantTitle: i.variantTitle,
      imageUrl: i.imageUrl,
      unitPrice: toNumber(i.unitPrice),
      quantity: i.quantity,
      lineTotal: toNumber(i.lineTotal),
    })),
    tracking: order.shipments[0]
      ? {
          carrier: order.shipments[0].carrier,
          trackingUrl: order.shipments[0].trackingUrl,
          status: order.shipments[0].status,
        }
      : null,
    placedAt: order.placedAt,
    paidAt: order.paidAt,
  };
}

export async function updatePublicCheckout(token: string, patch: CheckoutPatch) {
  const order = await getOrderByToken(token);
  if (order.status !== "DRAFT")
    throw new ShopError("CONFLICT", "This order has already been placed");
  await repriceOrder(order.id, patch);
  if (patch.shippingAddress) {
    await prisma.shopOrder.update({ where: { id: order.id }, data: { checkoutStage: "PAYMENT" } });
  }
  return getPublicCheckout(token);
}

export async function payPublicCheckout(token: string, method: "online" | "cod" | "bank") {
  const order = await prisma.shopOrder.findUnique({
    where: { checkoutToken: token },
    include: { store: true },
  });
  if (!order) throw new ShopError("NOT_FOUND", "Checkout not found");
  if (order.paymentStatus === "PAID") return { status: "paid" as const };
  const address = order.shippingAddress as ShopAddress | null;
  if (order.store.askAddress && order.status === "DRAFT" && !address?.line1)
    throw new ShopError("INVALID", "Add a delivery address first");

  if (method === "online") {
    const link = await createPaymentLink(order.id);
    return { status: "redirect" as const, url: link.url };
  }
  if (method === "cod") {
    if (!order.store.codEnabled)
      throw new ShopError("PAYMENT_UNAVAILABLE", "Cash on delivery isn't offered");
    await placeOrder(order.id, { paymentMethod: "cod", codPending: true });
    return { status: "placed" as const };
  }
  if (!order.store.bankTransferEnabled)
    throw new ShopError("PAYMENT_UNAVAILABLE", "Bank transfer isn't offered");
  await placeOrder(order.id, { paymentMethod: "bank" });
  return { status: "placed" as const, bank: order.store.bankDetails };
}

// ─── Storefront cart → checkout ──────────────────────────────────────────────

/** A storefront cart becomes a draft order; the browser is sent to its hosted checkout. */
export async function checkoutFromStorefront(
  slug: string,
  items: CartLineInput[],
  customer?: { phone?: string; name?: string },
) {
  const store = await prisma.shopStore.findUnique({ where: { slug } });
  if (!store || !store.storefrontEnabled) throw new ShopError("NOT_FOUND", "Shop not found");
  const order = await createDraftOrder({
    store,
    items,
    channel: "STOREFRONT",
    source: "storefront",
    customer: { phone: customer?.phone ?? null, name: customer?.name ?? null },
    attribution: { kind: "storefront" },
  });
  return { token: order.checkoutToken!, url: checkoutUrl(order.checkoutToken!) };
}

/** Staff-created order from the inbox: priced now, then a payment link or checkout link sent in chat. */
export async function createOrderFromInbox(input: {
  orgId: string;
  contactId: string;
  channel: ShopChannel;
  channelAccountId?: string | null;
  items: CartLineInput[];
  discountCode?: string | null;
  shippingRateId?: string | null;
  send: "payment_link" | "checkout_link" | "none";
  actorUserId: string;
}) {
  const store = await getOrCreateStore(input.orgId);
  const contact = await prisma.contact.findFirst({
    where: { id: input.contactId, orgId: input.orgId },
    select: { id: true, name: true, phone: true },
  });
  if (!contact) throw new ShopError("NOT_FOUND", "Contact not found");
  if (input.send === "payment_link" && !(await pickProvider(store))) {
    throw new ShopError(
      "PAYMENT_UNAVAILABLE",
      "Connect Stripe or Razorpay in Commerce → Payments to send payment links, or send a checkout link instead",
    );
  }
  const draft = await createDraftOrder({
    store,
    items: input.items,
    channel: input.channel,
    source: "agent",
    contactId: contact.id,
    channelAccountId: input.channelAccountId,
    createdById: input.actorUserId,
  });
  let order = await repriceOrder(draft.id, {
    ...(input.discountCode ? { discountCode: input.discountCode } : {}),
    ...(input.shippingRateId ? { shippingRateId: input.shippingRateId } : {}),
  });
  let delivery: { sent: boolean; url?: string } = { sent: false };
  if (input.send === "payment_link") {
    const link = await sendPaymentLink(order.id, { actorUserId: input.actorUserId });
    delivery = { sent: link.delivered, url: link.url };
  } else if (input.send === "checkout_link") {
    const outcome = await sendCheckoutLink(await loadForChat(order.id));
    delivery = { sent: outcome.sent, url: checkoutUrl(order.checkoutToken!) };
  }
  order = await prisma.shopOrder.findUniqueOrThrow({
    where: { id: order.id },
    include: orderDetailInclude,
  });
  return { order, delivery };
}
