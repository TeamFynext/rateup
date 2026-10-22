import type { ShopChannel, ShopOrder, ShopStore } from "../../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import redis from "../../../utils/redisConnection.js";
import { armShopReminder } from "../../../workers/bullmq/queues/shop.queue.js";
import { sendAddressFlowToCustomer } from "../../whatsapp/catalog/catalogSettings.service.js";
import { DiscountRefused } from "./discounts.service.js";
import { checkoutUrl } from "./events.js";
import { paysInStore, storeLabel } from "./checkoutVia.js";
import {
  alignDraftCheckout,
  startStoreCheckout,
  storeChecksOut,
} from "./externalCheckout.service.js";
import { formatMoney } from "./money.js";
import { sendShopMessage, type ShopMessage } from "./notify.js";
import {
  addOrderEvent,
  assertDeliveryChosen,
  applyPrepaidDiscount,
  cancelOrder,
  CHECKOUT_EXPIRED_REASON,
  confirmCodOrder,
  createDraftOrder,
  assertCheckoutOpen,
  getOrder,
  getOrderByToken,
  markOrderPaid,
  placeOrder,
  pointsOfferForOrder,
  repriceOrder,
  revertPrepaidDiscount,
  type CartLineInput,
  type CheckoutPatch,
} from "./orders.service.js";
import {
  createPaymentLink,
  pickProvider,
  refreshPendingPayment,
} from "./payments/payments.service.js";
import { toNumber } from "./pricing.js";
import {
  assertOfflineOrderAllowed,
  customerReachable,
  startPhoneVerification,
} from "./phoneVerify.service.js";
import { ShopError } from "./shop.errors.js";
import {
  assertCanTakeOrder,
  ORDER_LIMIT_MESSAGE,
  orderAllowance,
  storeAcceptingOrders,
} from "./orderAllowance.js";
import { inStoreCheckout } from "./checkoutVia.js";
import type { ShopAddress, ShopAttribution } from "./shop.types.js";
import { commerceEnabled, getOrCreateStore, ratesForDestination } from "./store.service.js";

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
  formatMoney(toNumber(n as number), o.currency);

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
  const loaded = await loadForChat(orderId);
  if (loaded.status !== "DRAFT") return;
  // Told now, in the chat, rather than after an address and a delivery choice.
  if ((await orderAllowance(loaded)).exceeded) {
    await addOrderEvent(orderId, "order_limit", "Not offered: the plan's monthly orders are used");
    return send(loaded, { text: ORDER_LIMIT_MESSAGE });
  }
  return advanceChatCheckout(loaded);
}

async function advanceChatCheckout(loaded: OrderForChat): Promise<unknown> {
  const orderId = loaded.id;
  const { store } = loaded;
  const order = await alignDraftCheckout(loaded, store);
  if (paysInStore(order)) return sendStoreCheckoutLink(order);

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
    return advanceChatCheckout(await loadForChat(orderId));
  }

  if (order.checkoutStage === "DELIVERY") {
    const address = order.shippingAddress as ShopAddress | null;
    const rates = store.askDelivery ? await ratesForDestination(store.id, address?.country) : [];
    if (store.askDelivery && !rates.length) {
      try {
        await assertDeliveryChosen(order, store);
      } catch (error) {
        if (!(error instanceof ShopError)) throw error;
        await addOrderEvent(order.id, "undeliverable", error.message);
        return send(order, {
          text: `Sorry, we can't deliver order #${order.number} to that address (${error.message}). Reply here and our team will help.`,
        });
      }
    }
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
    return advanceChatCheckout(await loadForChat(orderId));
  }

  if (order.checkoutStage === "LOYALTY") {
    const offer = order.pointsRedeemed > 0 ? null : await pointsOfferForOrder(order.id);
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
    return advanceChatCheckout(await loadForChat(orderId));
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

/**
 * Nothing left to pay (a 100% coupon, points covering it all): placed and paid at once, since
 * no gateway takes a zero amount. Placed as unpaid first, so stock, the coupon and the plan's
 * monthly orders can still refuse it; nothing was charged that would have to be honoured.
 */
async function completeFreeOrder(orderId: string) {
  const order = await prisma.shopOrder.findUniqueOrThrow({
    where: { id: orderId },
    include: { store: true },
  });
  if (order.status === "DRAFT") {
    await assertCanTakeOrder(order);
    await assertDeliveryChosen(order, order.store);
    await placeOrder(orderId, { paymentMethod: "free" });
  }
  await markOrderPaid(orderId, { provider: "free", amount: 0 });
}

const isFree = (order: Pick<ShopOrder, "total">) => toNumber(order.total) <= 0;

async function askForPayment(order: OrderForChat) {
  const full = await prisma.shopOrder.findUniqueOrThrow({
    where: { id: order.id },
    include: { items: true },
  });
  if (isFree(full)) return completeFreeOrder(order.id);
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
  const loaded = await loadForChat(orderId);
  const order = await alignDraftCheckout(loaded, loaded.store);
  // Paid on the store's own page: the link to resend is that checkout, never a second one.
  if (paysInStore(order)) {
    const outcome = await sendStoreCheckoutLink(order);
    return {
      url: checkoutUrl(order.checkoutToken!),
      provider: null,
      amount: toNumber(order.total),
      currency: order.currency,
      expiresAt: null,
      delivered: outcome.sent,
      deliveryError: outcome.sent ? null : outcome.reason,
    };
  }
  if (isFree(order)) {
    await completeFreeOrder(orderId);
    return {
      url: checkoutUrl(order.checkoutToken!),
      provider: null,
      amount: 0,
      currency: order.currency,
      expiresAt: null,
      delivered: true,
      deliveryError: null,
    };
  }
  if (order.status === "DRAFT") await assertDeliveryChosen(order, order.store);
  const link = await createPaymentLink(orderId, {
    provider: opts.provider,
    acceptPriceChange: true,
  });
  const full = await prisma.shopOrder.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  });
  const moved = link.priceChange
    ? `Prices have changed since this order was started, so the total is now ${money(order, link.priceChange.after)}.\n\n`
    : "";
  const outcome = await send(order, {
    text: `${moved}${summary(full)}\n\nPay securely by card or wallet. The link is valid for ${order.store.paymentLinkTtlHours} hours.`,
    cta: { label: `Pay ${money(order, link.amount)}`, url: link.url },
  });
  await armPaymentReminders(order);
  return { ...link, delivered: outcome.sent, deliveryError: outcome.sent ? null : outcome.reason };
}

/**
 * The store's own checkout (Shopify, WooCommerce). The link is RateUp's page, which creates
 * the store's order only when opened. RateUp's cart reminders are not armed: the store
 * follows up its own carts.
 */
async function sendStoreCheckoutLink(order: OrderForChat) {
  const full = await prisma.shopOrder.findUniqueOrThrow({
    where: { id: order.id },
    include: { items: true },
  });
  const lines = full.items.map(
    (i) => `• ${i.title}${i.variantTitle ? ` (${i.variantTitle})` : ""} ×${i.quantity}`,
  );
  return send(order, {
    text: `Order #${order.number}\n${lines.join("\n")}\n\nAdd your delivery details and pay on our secure checkout page.`,
    cta: { label: "Checkout", url: checkoutUrl(full.checkoutToken!) },
  });
}

/** The hosted page: address, delivery, coupon, points and payment in one place. */
export async function sendCheckoutLink(loaded: OrderForChat) {
  const order = await alignDraftCheckout(loaded, loaded.store);
  if (paysInStore(order)) return sendStoreCheckoutLink(order);
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

const CART_REMINDER_WINDOW_SECONDS = 24 * 3600;

/**
 * One customer gets one run of cart reminders a day per store, whichever cart started it:
 * several abandoned carts would otherwise each send their own paid templates. The same order
 * may re-arm (every checkout message does).
 */
export async function claimCartReminders(order: ShopOrder) {
  const who = order.contactId ?? order.customerPhone;
  if (!who) return true;
  const key = `shop:cartReminders:${order.storeId}:${who}`;
  try {
    const set = await redis.set(key, order.id, "EX", CART_REMINDER_WINDOW_SECONDS, "NX");
    return set === "OK" || (await redis.get(key)) === order.id;
  } catch (err) {
    log.warn({ err, orderId: order.id }, "Cart reminder claim unavailable; arming anyway");
    return true;
  }
}

/**
 * Arms the cart reminders still ahead of now. Every checkout message calls this, so a step
 * whose time has passed is left alone: it has fired (or was due before the customer replied),
 * and re-adding it would send it again at once.
 */
async function armCartReminders(order: ShopOrder & { store: ShopStore }) {
  if (!(await claimCartReminders(order))) return;
  const steps = order.store.cartReminderMinutes ?? [];
  const start = order.createdAt.getTime();
  const now = Date.now();
  await Promise.all(
    steps.flatMap((minutes, step) => {
      const due = start + minutes * 60_000;
      return due > now ? [armShopReminder(order.id, "cart", step, new Date(due))] : [];
    }),
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
  if (!store || !(await commerceEnabled(store.orgId))) return null;
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

/**
 * Address submitted through the WhatsApp address form (flow token `shop:<orderId>`). The token
 * names the order, so it applies only to a draft of the contact who submitted the form.
 */
export async function handleShopAddressFlow(
  orderId: string,
  data: Record<string, string>,
  from: { orgId: string; contactId?: string | null },
) {
  if (!from.contactId) return false;
  const order = await prisma.shopOrder.findFirst({
    where: { id: orderId, orgId: from.orgId, contactId: from.contactId },
  });
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
  const [kind, orderId, arg, origin] = replyId.split(":");
  if (!orderId) return false;
  if (kind === "shop_buy") {
    const { buyNowFromChat } = await import("./recovery.service.js");
    return buyNowFromChat(
      orderId,
      Number(arg) || 1,
      from,
      origin === "bis" ? "back_in_stock" : undefined,
    );
  }
  // Only the customer an order belongs to can act on it; a reply id names the order, and
  // without a known sender anyone could cancel or confirm any order by its id.
  if (!from.contactId) return true;
  const order = await prisma.shopOrder.findFirst({
    where: { id: orderId, orgId: from.orgId, contactId: from.contactId },
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
        if (arg !== "online") await assertDeliveryChosen(order, order.store);
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
        // The button stays in the chat forever; once the order is confirmed, paid or packed,
        // cancelling it is the merchant's call, not an old message's.
        if (
          order.status !== "OPEN" ||
          order.paymentStatus !== "COD_PENDING" ||
          order.confirmedAt ||
          order.fulfillmentStatus !== "UNFULFILLED"
        ) {
          await send(order, {
            text: `Order #${order.number} can't be cancelled from here any more. Reply here and we'll help.`,
          }).catch(() => {});
          return true;
        }
        await cancelOrder(order.id, {
          reason: "Customer cancelled the cash order",
          onlyIf: {
            status: "OPEN",
            paymentStatus: "COD_PENDING",
            confirmedAt: null,
            fulfillmentStatus: "UNFULFILLED",
          },
        });
        return true;
      case "shop_cod_prepay": {
        const pct = toNumber(order.store.codPrepaidDiscountPct);
        if (order.paymentStatus !== "COD_PENDING" || pct <= 0) return true;
        await convertCodToPrepaid(order, pct);
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
    log.warn({ err, replyId }, "Shop reply failed");
    const text =
      err instanceof ShopError && err.code === "ORDER_LIMIT"
        ? err.message
        : `${err instanceof ShopError ? err.message : "Something went wrong with that step"}. Reply here and we'll sort it out.`;
    await send(order, { text }).catch(() => {});
    return true;
  }
}

/**
 * The cash order becomes a prepaid one at a discount, then gets a payment link for it. Undone
 * if no link goes out, or the order would sit PENDING with no link and no deadline.
 */
async function convertCodToPrepaid(order: OrderForChat, pct: number) {
  if (!(await pickProvider(order.store)))
    throw new ShopError("PAYMENT_UNAVAILABLE", "Paying online isn't available right now");
  const switched = await applyPrepaidDiscount(order.id, pct);
  if (!switched) return;
  try {
    await sendPaymentLink(order.id);
  } catch (err) {
    await revertPrepaidDiscount(switched.order);
    throw err;
  }
  await addOrderEvent(
    order.id,
    "cod_prepaid",
    `Switched to paying online for ${pct}% off (−${money(switched.order, switched.saved)})`,
  );
}

// ─── The hosted checkout page ────────────────────────────────────────────────

export async function getPublicCheckout(token: string, opts: { justPaid?: boolean } = {}) {
  let order = await getOrderByToken(token);
  if (opts.justPaid && order.paymentStatus !== "PAID") {
    await refreshPendingPayment(order);
    order = await getOrderByToken(token);
  }
  const store = await prisma.shopStore.findUniqueOrThrow({ where: { id: order.storeId } });
  order = await alignDraftCheckout(order, store);
  const inStore = paysInStore(order);
  const address = order.shippingAddress as ShopAddress | null;
  const [rates, online, offer, anyRate, whatsappNumber, acceptingOrders] = await Promise.all([
    ratesForDestination(store.id, address?.country),
    pickProvider(store),
    order.status === "DRAFT" ? pointsOfferForOrder(order.id) : null,
    prisma.shopShippingRate.count({ where: { storeId: store.id, active: true } }),
    shopWhatsappNumber(order),
    storeAcceptingOrders(store.orgId),
  ]);
  const subtotal = toNumber(order.subtotal);
  const expired = checkoutExpired(order);
  const invoiceAvailable = canInvoice(order);
  return {
    checkoutExpired: expired,
    invoiceAvailable,
    store: {
      whatsappNumber,
      acceptingOrders,
      name: store.name,
      slug: store.slug,
      logoUrl: store.logoUrl,
      currency: store.currency,
      allowCoupons: store.allowCoupons && !inStore,
      askAddress: store.askAddress,
      // Mirrors assertDeliveryChosen, so the page blocks payment the server would refuse.
      chargesDelivery: store.askDelivery && anyRate > 0,
      storefrontEnabled: store.storefrontEnabled,
      pricesIncludeTax: store.pricesIncludeTax,
    },
    order: {
      ...publicOrder(order),
      checkoutExpired: expired,
      invoiceAvailable,
      awaitingConfirmation:
        order.paymentStatus === "COD_PENDING" && store.codConfirm && !order.confirmedAt,
      returnRequested: order.returns.some((r) => OPEN_RETURN.has(r.status)),
    },
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
    points: inStore ? null : offer,
    paymentOptions: inStore
      ? { online: null, cod: false, bank: false }
      : {
          online: online ? { provider: online.provider.id, label: online.provider.label } : null,
          cod: store.codEnabled,
          bank: store.bankTransferEnabled,
        },
    // Paid on the shop's own Shopify or WooCommerce checkout. WooCommerce's payment page asks
    // for no address or delivery, so this page asks first (`collectsDetails`).
    storeCheckout: inStore
      ? {
          provider: order.checkoutVia === "WOOCOMMERCE" ? "woocommerce" : "shopify",
          label: storeLabel(order.checkoutVia),
          url: order.externalCheckoutUrl,
          collectsDetails: order.checkoutVia === "WOOCOMMERCE" && !order.externalCheckoutUrl,
        }
      : null,
  };
}

/** A draft past its window, or one the abandoned-draft sweep cancelled. */
function checkoutExpired(
  order: Pick<ShopOrder, "status" | "checkoutExpiresAt" | "cancelReason">,
  now = new Date(),
) {
  if (order.status === "DRAFT") return !!order.checkoutExpiresAt && order.checkoutExpiresAt < now;
  return order.status === "CANCELLED" && order.cancelReason === CHECKOUT_EXPIRED_REASON;
}

const OPEN_RETURN = new Set(["REQUESTED", "APPROVED", "RECEIVED"]);

/** Mirrors `ensureInvoice` in invoice.service.ts. */
const INVOICEABLE = new Set<ShopOrder["paymentStatus"]>(["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]);
const canInvoice = (order: Pick<ShopOrder, "paymentStatus" | "checkoutVia">) =>
  INVOICEABLE.has(order.paymentStatus) && !inStoreCheckout(order.checkoutVia);

/** Digits for https://wa.me/<digits>: the number the order runs on, else the org's first. */
async function shopWhatsappNumber(
  order: Pick<ShopOrder, "orgId" | "channel" | "channelAccountId">,
) {
  const numbers = await prisma.whatsappSettings.findMany({
    where: { orgId: order.orgId, phone: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { phone: true, phoneId: true },
  });
  const own =
    order.channel === "WHATSAPP" && order.channelAccountId
      ? numbers.find((n) => n.phoneId === order.channelAccountId)
      : undefined;
  const digits = (own ?? numbers[0])?.phone?.replace(/\D/g, "");
  return digits || null;
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
  if (paysInStore(order)) {
    if (order.externalCheckoutUrl)
      throw new ShopError("CONFLICT", "This order is already at the shop's checkout");
    if (patch.discountCode || patch.usePoints)
      throw new ShopError(
        "DISCOUNT_INVALID",
        `Codes and points are used on the ${storeLabel(order.checkoutVia)} checkout page`,
      );
  }
  // A chat order is messaged on the contact's own number; the page must not redirect it.
  const safePatch =
    order.channel !== "STOREFRONT" && patch.customer
      ? { ...patch, customer: { ...patch.customer, phone: undefined } }
      : patch;
  await repriceOrder(order.id, safePatch);
  if (patch.shippingAddress) {
    await prisma.shopOrder.update({ where: { id: order.id }, data: { checkoutStage: "PAYMENT" } });
  }
  return getPublicCheckout(token);
}

export async function payPublicCheckout(
  token: string,
  method: "online" | "cod" | "bank",
  ip?: string | null,
) {
  const order = await prisma.shopOrder.findUnique({
    where: { checkoutToken: token },
    include: { store: true },
  });
  if (!order) throw new ShopError("NOT_FOUND", "Checkout not found");
  if (order.paymentStatus === "PAID") return { status: "paid" as const };
  if (paysInStore(order))
    throw new ShopError(
      "CONFLICT",
      `This order is paid on the ${storeLabel(order.checkoutVia)} checkout page`,
    );
  const address = order.shippingAddress as ShopAddress | null;
  if (order.store.askAddress && order.status === "DRAFT" && !address?.line1)
    throw new ShopError("INVALID", "Add a delivery address first");
  if (order.status === "DRAFT") await assertDeliveryChosen(order, order.store);
  if (method === "cod" && !order.store.codEnabled)
    throw new ShopError("PAYMENT_UNAVAILABLE", "Cash on delivery isn't offered");
  if (method === "bank" && !order.store.bankTransferEnabled)
    throw new ShopError("PAYMENT_UNAVAILABLE", "Bank transfer isn't offered");
  // A cash, transfer or free order proves nothing about the typed number, and placing one
  // messages it: the shopper confirms on WhatsApp first, and the order is placed from there.
  if (
    order.status === "DRAFT" &&
    !customerReachable(order) &&
    (method !== "online" || isFree(order))
  ) {
    const check = await startPhoneVerification({
      store: order.store,
      purpose: "checkout",
      orderId: order.id,
      method,
      prompt: `Confirm my order #${order.number}.`,
      ip,
    });
    return { status: "verify" as const, ...check };
  }
  if (isFree(order)) {
    await completeFreeOrder(order.id);
    return { status: "paid" as const };
  }

  if (method === "online") {
    const link = await createPaymentLink(order.id);
    return { status: "redirect" as const, url: link.url };
  }
  await assertOfflineOrderAllowed(order.storeId, order.customerPhone);
  if (method === "cod") {
    await placeOrder(order.id, { paymentMethod: "cod", codPending: true });
    return { status: "placed" as const };
  }
  await placeOrder(order.id, { paymentMethod: "bank" });
  return { status: "placed" as const, bank: order.store.bankDetails };
}

/**
 * The customer continues to the shop's own checkout from RateUp's page. Creates the store's
 * order on first use and returns the same page after that.
 */
export async function startPublicStoreCheckout(token: string) {
  const order = await getOrderByToken(token);
  const store = await prisma.shopStore.findUniqueOrThrow({ where: { id: order.storeId } });
  const aligned = await alignDraftCheckout(order, store);
  if (!paysInStore(aligned)) throw new ShopError("INVALID", "This order is paid on this page");
  if (aligned.externalCheckoutUrl) return { url: aligned.externalCheckoutUrl };
  if (aligned.status !== "DRAFT")
    throw new ShopError("CONFLICT", "This order has already been placed");
  assertCheckoutOpen(aligned);
  await assertCanTakeOrder(aligned);
  return { url: await startStoreCheckout(aligned.id) };
}

// ─── Storefront cart → checkout ──────────────────────────────────────────────

/**
 * The storefront's last checkout for this bag, when it is still an open draft of exactly
 * these lines: going back and pressing Checkout again reuses it rather than starting another
 * order (and, for a store checkout, another order in the store).
 */
async function reusableStorefrontDraft(
  storeId: string,
  token: string | undefined,
  items: CartLineInput[],
) {
  if (!token) return null;
  const order = await prisma.shopOrder.findUnique({
    where: { checkoutToken: token },
    include: { items: true },
  });
  if (
    !order ||
    order.storeId !== storeId ||
    order.channel !== "STOREFRONT" ||
    order.status !== "DRAFT" ||
    order.paymentStatus === "PAID" ||
    (order.checkoutExpiresAt && order.checkoutExpiresAt < new Date())
  )
    return null;
  const wanted = new Map<string, number>();
  for (const i of items) {
    if (!i.variantId) return null;
    wanted.set(i.variantId, (wanted.get(i.variantId) ?? 0) + Math.max(1, Math.floor(i.quantity)));
  }
  const same =
    order.items.length === wanted.size &&
    order.items.every((i) => i.variantId && wanted.get(i.variantId) === i.quantity);
  return same ? order : null;
}

/** A storefront cart becomes a draft order; the browser is sent to its hosted checkout. */
export async function checkoutFromStorefront(
  slug: string,
  items: CartLineInput[],
  customer?: { phone?: string; name?: string },
  reuseToken?: string,
) {
  const store = await prisma.shopStore.findUnique({ where: { slug } });
  if (!store || !store.storefrontEnabled || !(await commerceEnabled(store.orgId)))
    throw new ShopError("NOT_FOUND", "Shop not found");
  const reused = await reusableStorefrontDraft(store.id, reuseToken, items);
  if (reused) return { token: reused.checkoutToken!, url: checkoutUrl(reused.checkoutToken!) };
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
  await assertCanTakeOrder({ orgId: input.orgId, source: "agent" }, "staff");
  const store = await getOrCreateStore(input.orgId);
  const contact = await prisma.contact.findFirst({
    where: { id: input.contactId, orgId: input.orgId },
    select: { id: true, name: true, phone: true },
  });
  if (!contact) throw new ShopError("NOT_FOUND", "Contact not found");
  const external = storeChecksOut(store);
  if (external && input.discountCode)
    throw new ShopError(
      "DISCOUNT_INVALID",
      "This shop checks out in your online store, so coupons are entered on its checkout page",
    );
  if (!external && input.send === "payment_link" && !(await pickProvider(store))) {
    throw new ShopError(
      "PAYMENT_UNAVAILABLE",
      "Connect Stripe or Razorpay in Commerce → Settings → Getting paid to send payment links, or send a checkout link instead",
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
  const order = await repriceOrder(draft.id, {
    ...(input.discountCode ? { discountCode: input.discountCode } : {}),
    ...(input.shippingRateId ? { shippingRateId: input.shippingRateId } : {}),
  }).catch((err: unknown) => {
    // Staff are told why a code was refused; shoppers only ever see the generic message.
    if (err instanceof DiscountRefused) throw new ShopError("DISCOUNT_INVALID", err.reason);
    throw err;
  });
  // `url` is always the order's checkout page, the link staff can copy whatever was sent:
  // it leads to the payment link or, for a store checkout, to the store's page.
  const sent =
    input.send === "none"
      ? false
      : external || input.send === "checkout_link"
        ? (await sendCheckoutLink(await loadForChat(order.id))).sent
        : (await sendPaymentLink(order.id, { actorUserId: input.actorUserId })).delivered;
  const token = (
    await prisma.shopOrder.findUniqueOrThrow({
      where: { id: order.id },
      select: { checkoutToken: true },
    })
  ).checkoutToken;
  const url = checkoutUrl(token ?? order.checkoutToken!);
  const { checkoutToken: _token, ...detail } = await getOrder(store.id, order.id);
  return {
    order: { ...detail, checkoutUrl: detail.status === "DRAFT" ? url : null },
    delivery: { sent, url },
  };
}
