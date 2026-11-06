import { createHmac, timingSafeEqual } from "node:crypto";

import type {
  ShopCheckoutVia,
  ShopOrder,
  ShopSourceMode,
  ShopStore,
} from "../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import redis from "../../../utils/redisConnection.js";
import { inStoreCheckout, STORE_LABEL } from "./checkoutVia.js";
import { checkoutUrl } from "./events.js";
import {
  addOrderEvent,
  assertDeliveryChosen,
  cancelOrder,
  channelLabel,
  markOrderPaid,
  setFulfillmentStatus,
} from "./orders.service.js";
import { round2, toNumber } from "./pricing.js";
import { ShopError } from "./shop.errors.js";
import type { ShopAddress } from "./shop.types.js";

/**
 * Checkout in the merchant's own Shopify or WooCommerce store. RateUp still starts the order
 * (so its number, source and ad attribution are kept) and every link points at RateUp's
 * `/c/<token>`; the store's order is only created when that page is opened, so a reply nobody
 * opens leaves nothing behind in the store. Shopify's checkout asks for the address and
 * delivery itself; WooCommerce's pay-for-order page doesn't, so RateUp's page asks first.
 * The store's order webhooks report back through `syncOrderFromStore`.
 */

type ExternalVia = Exclude<ShopCheckoutVia, "RATEUP">;
type Provider = "shopify" | "woocommerce";

const PROVIDER: Record<ExternalVia, Provider> = { SHOPIFY: "shopify", WOOCOMMERCE: "woocommerce" };
const LABEL = STORE_LABEL;

export const storeChecksOut = (store: Pick<ShopStore, "checkoutVia">) =>
  inStoreCheckout(store.checkoutVia);

/** Where a store that starts following `mode` checks out unless the merchant picks otherwise. */
export function defaultCheckoutVia(mode: ShopSourceMode): ShopCheckoutVia {
  if (mode === "SHOPIFY") return "SHOPIFY";
  if (mode === "WOOCOMMERCE") return "WOOCOMMERCE";
  return "RATEUP";
}

/** Whether the Shopify or WooCommerce integration a shop follows is connected right now. */
export async function storeConnected(orgId: string, via: ShopCheckoutVia | ShopSourceMode) {
  if (via !== "SHOPIFY" && via !== "WOOCOMMERCE") return false;
  const row = await prisma.integration.findFirst({
    where: { orgId, name: PROVIDER[via], active: true },
    select: { id: true },
  });
  return Boolean(row);
}

/** A store's checkout can only be the store its products follow, and only while connected. */
export async function assertCheckoutVia(
  store: Pick<ShopStore, "orgId" | "mode">,
  via: ShopCheckoutVia,
) {
  if (via === "RATEUP") return;
  const label = LABEL[via];
  if (store.mode !== via)
    throw new ShopError(
      "INVALID",
      `Checkout in ${label} needs your products to stay in sync with ${label}. Import them from ${label} with "Keep in sync" on first.`,
    );
  if (!(await storeConnected(store.orgId, via)))
    throw new ShopError("INVALID", `Connect ${label} first`);
}

/**
 * The link that finishes this order: RateUp's `/c/<token>`, which sends a store-checkout
 * order on to the store when opened. Null once the order can no longer be checked out.
 */
export async function checkoutLinkFor(orderId: string): Promise<string | null> {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    select: { status: true, checkoutToken: true },
  });
  if (!order || order.status !== "DRAFT" || !order.checkoutToken) return null;
  return checkoutUrl(order.checkoutToken);
}

/**
 * A draft that hasn't reached the store or a payment gateway yet pays wherever the shop
 * checks out now, so switching the setting (or losing the store) never strands open carts.
 */
export async function alignDraftCheckout<T extends ShopOrder>(order: T, store: ShopStore) {
  if (order.status !== "DRAFT" || order.externalCheckoutUrl) return order;
  if (order.checkoutVia === store.checkoutVia) return order;
  const pending = await prisma.shopPayment.count({
    where: { orderId: order.id, status: "PENDING" },
  });
  if (pending) return order;
  const toStore = inStoreCheckout(store.checkoutVia);
  await prisma.shopOrder.update({
    where: { id: order.id },
    data: {
      checkoutVia: store.checkoutVia,
      // Back to RateUp: the page asks for whatever is still missing.
      checkoutStage: toStore ? "PAYMENT" : order.shippingAddress ? "PAYMENT" : "ADDRESS",
    },
  });
  return { ...order, checkoutVia: store.checkoutVia };
}

/**
 * Shopify copies a draft's custom attributes onto the order it becomes, but a shopper can also
 * set note attributes on any cart. The signature proves the `rateup_order_id` was put there by
 * RateUp, for this org. Signed with the flow-token secret under its own prefix.
 */
export function signStoreCheckout(orgId: string, orderId: string): string {
  const secret = process.env.FLOW_TOKEN_SECRET;
  if (!secret) throw new Error("FLOW_TOKEN_SECRET environment variable must be set");
  return createHmac("sha256", secret).update(`sco:${orgId}:${orderId}`).digest("base64url");
}

export function verifyStoreCheckout(orgId: string, orderId: string, sig: string | null) {
  if (!sig) return false;
  const expected = signStoreCheckout(orgId, orderId);
  return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

const LOCK_SECONDS = 30;
const lockKey = (orderId: string) => `shop:storeCheckout:${orderId}`;

async function waitForWinner(orderId: string) {
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 250));
    const o = await prisma.shopOrder.findUnique({
      where: { id: orderId },
      select: { externalCheckoutUrl: true },
    });
    if (o?.externalCheckoutUrl) return o.externalCheckoutUrl;
  }
  throw new ShopError("CONFLICT", "Checkout is opening in another window. Try again in a moment.");
}

/**
 * Creates the order in the store and returns its payment page. Idempotent per order: a second
 * call (another tap, a reload) returns the same page; a lock keeps two at once from creating
 * two store orders.
 */
export async function startStoreCheckout(orderId: string): Promise<string> {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { store: true, items: { include: { variant: { include: { product: true } } } } },
  });
  if (!order) throw new ShopError("NOT_FOUND", "Order not found");
  if (order.externalCheckoutUrl) return order.externalCheckoutUrl;
  if (order.status !== "DRAFT")
    throw new ShopError("CONFLICT", "This order has already been placed");
  const via = order.checkoutVia;
  if (via === "RATEUP") throw new ShopError("INVALID", "This order checks out in RateUp");
  const provider = PROVIDER[via];
  if (!(await storeConnected(order.orgId, via)))
    throw new ShopError(
      "PAYMENT_UNAVAILABLE",
      "Checkout isn't available right now. Message the shop and they'll help you order.",
    );

  const foreign = order.items.filter((i) => i.variant?.product.externalSource !== provider);
  if (foreign.length)
    throw new ShopError(
      "INVALID",
      `${foreign.map((i) => i.title).join(", ")} can't be bought online right now. Remove ${foreign.length === 1 ? "it" : "them"} to check out.`,
    );
  const address = order.shippingAddress as ShopAddress | null;
  if (provider === "woocommerce") {
    if (order.store.askAddress && !address?.line1)
      throw new ShopError("INVALID", "Add a delivery address first");
    await assertDeliveryChosen(order, order.store);
  }

  const got = await redis
    .set(lockKey(order.id), "1", "EX", LOCK_SECONDS, "NX")
    .catch(() => "OK" as const);
  if (got !== "OK") return waitForWinner(order.id);
  try {
    const created = await createInStore(order, provider);
    // Conditional, so a creation racing past the lock (Redis down) keeps the first store order.
    const { count } = await prisma.shopOrder.updateMany({
      where: { id: order.id, externalCheckoutUrl: null },
      data: {
        externalProvider: provider,
        externalId: created.id,
        externalName: created.name,
        externalCheckoutUrl: created.url,
      },
    });
    if (!count) {
      await discardStoreOrder(order.orgId, provider, created.id);
      const winner = await prisma.shopOrder.findUniqueOrThrow({ where: { id: order.id } });
      return winner.externalCheckoutUrl!;
    }
    await addOrderEvent(order.id, "external", `Sent to ${LABEL[via]} checkout`, {
      externalId: created.id,
    });
    return created.url;
  } finally {
    await redis.del(lockKey(order.id)).catch(() => {});
  }
}

type StoreOrderInput = NonNullable<Awaited<ReturnType<typeof loadForStore>>>;
const loadForStore = (orderId: string) =>
  prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { store: true, items: { include: { variant: { include: { product: true } } } } },
  });

async function createInStore(
  order: StoreOrderInput,
  provider: Provider,
): Promise<{ id: string; name: string | null; url: string }> {
  const label = provider === "shopify" ? "Shopify" : "WooCommerce";
  const source = order.source ?? order.channel.toLowerCase();
  try {
    if (provider === "shopify") {
      const { createShopifyCheckoutDraft } =
        await import("../../integrations/shopify/shopify.catalog.js");
      const draft = await createShopifyCheckoutDraft(
        order.orgId,
        order.items.map((i) => ({
          retailerId: i.retailerId ?? i.variant!.retailerId,
          quantity: i.quantity,
          title: i.title,
        })),
        {
          attributes: {
            rateup_order_id: order.id,
            rateup_sig: signStoreCheckout(order.orgId, order.id),
            rateup_source: source,
          },
          tags: ["rateup", `rateup-${source}`],
          note: `RateUp order #${order.number} · ${channelLabel(order.channel)}`,
          email: order.customerEmail,
          phone: order.customerPhone ? `+${order.customerPhone.replace(/^\+/, "")}` : null,
        },
      );
      return { id: draft.id, name: null, url: draft.invoiceUrl };
    }
    const { createWooCheckoutOrder } =
      await import("../../integrations/woocommerce/woocommerce.shopOrders.js");
    const address = (order.shippingAddress ?? {}) as ShopAddress;
    const [first, ...rest] = (address.name ?? order.customerName ?? "").split(" ");
    const rate = order.shippingRate as { name?: string; price?: number } | null;
    const woo = await createWooCheckoutOrder(order.orgId, {
      rateupOrderId: order.id,
      source,
      lines: order.items.map((i) => ({
        productExternalId: i.variant!.product.externalId,
        retailerId: i.retailerId ?? i.variant!.retailerId,
        quantity: i.quantity,
      })),
      address: address.line1
        ? {
            first_name: first,
            last_name: rest.join(" "),
            address_1: address.line1,
            address_2: address.line2,
            city: address.city,
            state: address.region,
            postcode: address.postalCode,
            country: address.country,
          }
        : null,
      email: order.customerEmail,
      phone: address.phone ?? order.customerPhone,
      shipping: rate ? { name: rate.name ?? "Delivery", price: toNumber(rate.price ?? 0) } : null,
      note: `RateUp order #${order.number}`,
    });
    return { id: woo.id, name: woo.number ? `#${woo.number}` : null, url: woo.payUrl };
  } catch (err) {
    const { StoreItemsGone } = await import("../../integrations/shopify/shopify.catalog.js");
    log.warn({ err, orderId: order.id, provider }, "Could not start a store checkout");
    if (err instanceof StoreItemsGone || wooProductGone(err)) {
      const titles = err instanceof StoreItemsGone ? err.titles : order.items.map((i) => i.title);
      await addOrderEvent(
        order.id,
        "external_failed",
        `${titles.join(", ")} ${titles.length === 1 ? "is" : "are"} no longer in ${label}`,
      );
      const { scheduleStoreMirror } = await import("./storeSync.service.js");
      await scheduleStoreMirror(order.orgId, provider).catch(() => {});
      throw new ShopError(
        "OUT_OF_STOCK",
        err instanceof StoreItemsGone
          ? `${titles.join(", ")} ${titles.length === 1 ? "is" : "are"} no longer available. Remove ${titles.length === 1 ? "it" : "them"} and check out again.`
          : "Something in this order is no longer available. Message the shop and they'll help you order.",
      );
    }
    await addOrderEvent(
      order.id,
      "external_failed",
      `Could not start checkout in ${label}: ${err instanceof Error ? err.message : "unknown error"}`,
    );
    throw new ShopError(
      "PAYMENT_UNAVAILABLE",
      "Checkout isn't available right now. Please try again in a few minutes.",
    );
  }
}

/** WooCommerce refuses a line whose product or variation was deleted with an `invalid` code. */
function wooProductGone(err: unknown) {
  const data = (err as { response?: { data?: { code?: string; message?: string } } }).response
    ?.data;
  return (
    /invalid_(product|variation)/.test(data?.code ?? "") ||
    /product.*(not exist|invalid)/i.test(data?.message ?? "")
  );
}

async function discardStoreOrder(orgId: string, provider: Provider, id: string) {
  try {
    if (provider === "shopify") {
      const { deleteShopifyDraftOrder } =
        await import("../../integrations/shopify/shopify.shopOrders.js");
      await deleteShopifyDraftOrder(orgId, id);
    } else {
      const { cancelWooOrder } =
        await import("../../integrations/woocommerce/woocommerce.shopOrders.js");
      await cancelWooOrder(orgId, id);
    }
  } catch (err) {
    log.warn({ err, orgId, provider, id }, "Could not remove a duplicate store checkout");
  }
}

/** Where staff open this order in the store's admin. */
export async function externalAdminUrl(
  order: Pick<
    ShopOrder,
    "orgId" | "externalProvider" | "externalId" | "status" | "paymentStatus" | "checkoutVia"
  >,
): Promise<string | null> {
  if (!order.externalId) return null;
  if (order.externalProvider === "shopify") {
    const { shopifyAdminDomain } = await import("../../integrations/shopify/shopify.shopOrders.js");
    const shop = await shopifyAdminDomain(order.orgId);
    if (!shop) return null;
    // An unpaid store checkout is still the draft the customer was sent.
    const draft = inStoreCheckout(order.checkoutVia) && order.status === "DRAFT";
    return `https://${shop}/admin/${draft ? "draft_orders" : "orders"}/${order.externalId}`;
  }
  if (order.externalProvider === "woocommerce") {
    const row = await prisma.integration.findFirst({
      where: { orgId: order.orgId, name: "woocommerce", active: true },
      select: { credential: true },
    });
    const storeUrl = (row?.credential as { storeUrl?: string } | null)?.storeUrl;
    return storeUrl ? `${storeUrl}/wp-admin/post.php?post=${order.externalId}&action=edit` : null;
  }
  return null;
}

/** What the store charged, as the store worked it out (its delivery, tax and discount codes). */
export interface StoreTotals {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
}

/** Without a positive total the store's figures are unusable, and RateUp's estimate stays. */
function cleanTotals(totals: StoreTotals | null | undefined): StoreTotals | null {
  if (!totals || !(totals.total > 0)) return null;
  const amount = (n: number) => (Number.isFinite(n) && n > 0 ? round2(n) : 0);
  return {
    subtotal: amount(totals.subtotal),
    discountTotal: amount(totals.discountTotal),
    shippingTotal: amount(totals.shippingTotal),
    taxTotal: amount(totals.taxTotal),
    total: round2(totals.total),
  };
}

/** What a store order webhook says about an order RateUp created there. */
export interface StoreOrderUpdate {
  status?: "paid" | "cancelled" | null;
  externalOrderId?: string | null;
  externalName?: string | null;
  totals?: StoreTotals | null;
  customer?: { name?: string | null; email?: string | null; phone?: string | null } | null;
  address?: ShopAddress | null;
  fulfillment?: "fulfilled" | "partial" | null;
  refund?: "full" | "partial" | null;
  /** `rateup_sig` from the store order. Required (Shopify) before a store checkout is paid. */
  signature?: string | null;
  /** The store order's lines, matched against RateUp's before a store checkout is paid. */
  lines?: { variantId?: string | null; sku?: string | null; quantity: number }[] | null;
}

type PaidCheck = { ok: true } | { ok: false; why: string };

/**
 * A paid store order only settles a RateUp store checkout when it is that checkout: signed by
 * RateUp, carrying the same items, and paid in full. Anything else is left for staff, so a
 * cheaper cart tagged with a RateUp order id can't mark it paid or lower its totals.
 */
async function checkStorePayment(
  provider: Provider,
  order: ShopOrder,
  update: StoreOrderUpdate,
  totals: StoreTotals | null,
): Promise<PaidCheck> {
  if (!totals) return { ok: false, why: "the store sent no total" };
  if (totals.total < toNumber(order.total) - 0.009)
    return { ok: false, why: `the store charged ${totals.total.toFixed(2)}, less than this order` };
  if (update.lines) {
    const items = await prisma.shopOrderItem.findMany({
      where: { orderId: order.id },
      select: { retailerId: true, sku: true, quantity: true },
    });
    const left = update.lines.map((l) => ({ ...l }));
    for (const item of items) {
      const line = left.find(
        (l) =>
          l.quantity >= item.quantity &&
          ((!!item.retailerId && (l.variantId === item.retailerId || l.sku === item.retailerId)) ||
            (!!item.sku && l.sku === item.sku)),
      );
      if (!line) return { ok: false, why: "its items don't match this order" };
      line.quantity -= item.quantity;
    }
  }
  return { ok: true };
}

/**
 * A store order webhook for an order RateUp created there: a store checkout, or a RateUp
 * order written back. The store's name for it, the customer and address it collected (only
 * where RateUp has none), fulfilment and refunds follow; paid places a store checkout at the
 * store's totals, and paid or cancelled moves a written-back cash order. Replays are no-ops.
 */
export async function syncOrderFromStore(
  provider: Provider,
  orgId: string,
  rateupOrderId: string,
  update: StoreOrderUpdate,
): Promise<ShopOrder | null> {
  if (!/^[0-9a-f-]{36}$/i.test(rateupOrderId)) return null;
  const order = await prisma.shopOrder.findFirst({
    where: { id: rateupOrderId, orgId, externalProvider: provider },
  });
  if (!order) return null;
  const label = provider === "shopify" ? "Shopify" : "WooCommerce";
  const storeCheckout = inStoreCheckout(order.checkoutVia);
  // Any Shopify cart can carry a `rateup_order_id` note attribute; only RateUp's signature, or
  // the store order id RateUp recorded, ties the webhook to this order.
  if (
    provider === "shopify" &&
    !verifyStoreCheckout(orgId, order.id, update.signature ?? null) &&
    !(update.externalOrderId && update.externalOrderId === order.externalId)
  ) {
    log.warn(
      { orderId: order.id, externalOrderId: update.externalOrderId },
      "Ignored a Shopify order that names a RateUp order it wasn't created for",
    );
    return null;
  }

  const missing = {
    ...(update.externalName && update.externalName !== order.externalName
      ? { externalName: update.externalName }
      : {}),
    ...(!order.customerName && update.customer?.name ? { customerName: update.customer.name } : {}),
    ...(!order.customerEmail && update.customer?.email
      ? { customerEmail: update.customer.email }
      : {}),
    ...(!order.customerPhone && update.customer?.phone
      ? { customerPhone: update.customer.phone.replace(/^\+/, "") }
      : {}),
    ...(!order.shippingAddress && update.address?.line1 ? { shippingAddress: update.address } : {}),
  };
  if (Object.keys(missing).length)
    await prisma.shopOrder.update({ where: { id: order.id }, data: missing });

  if (update.status === "cancelled") {
    if (order.status === "CANCELLED") return order;
    // The mirror's stock follows the store, which restocks its own copy.
    const cancelled = await cancelOrder(order.id, {
      reason: `Cancelled in ${label}`,
      restock: false,
      fromStore: true,
    });
    if (!storeCheckout && order.paymentStatus === "PAID")
      await addEventOnce(
        order.id,
        `Cancelled in ${label}, but RateUp took the payment — refund it from this order if the customer is owed it`,
      );
    return cancelled;
  }

  let current = order;
  if (update.status === "paid" && order.paymentStatus !== "PAID") {
    if (storeCheckout) {
      const totals = cleanTotals(update.totals);
      const check = await checkStorePayment(provider, order, update, totals);
      if (!check.ok) {
        log.warn(
          { orderId: order.id, provider, externalOrderId: update.externalOrderId, why: check.why },
          "Ignored a store payment that does not match the RateUp checkout",
        );
        await addEventOnce(
          order.id,
          `A ${label} order${update.externalName ? ` ${update.externalName}` : ""} was paid for this order, but ${check.why}. Check it in ${label} before marking this order paid.`,
        );
        return prisma.shopOrder.findUnique({ where: { id: order.id } });
      }
      await prisma.shopOrder.update({
        where: { id: order.id },
        data: {
          ...(totals && { ...totals, pointsDiscount: 0 }),
          ...(update.externalOrderId && { externalId: update.externalOrderId }),
        },
      });
      current = await markOrderPaid(order.id, {
        provider,
        paymentId: update.externalOrderId ?? null,
        ...(totals && { amount: totals.total }),
      });
    } else if (order.status === "OPEN") {
      // A written-back cash or transfer order paid in the store: it is paid there already.
      await prisma.shopOrder.update({
        where: { id: order.id },
        data: { externalPaidAt: new Date() },
      });
      current = await markOrderPaid(order.id, { provider: `${provider}_marked_paid` });
    }
  }

  if (update.fulfillment && current.status !== "DRAFT" && current.status !== "CANCELLED") {
    if (
      update.fulfillment === "fulfilled" &&
      ["UNFULFILLED", "PACKED"].includes(current.fulfillmentStatus)
    )
      await setFulfillmentStatus(order.id, "SHIPPED", null, `fulfilled in ${label}`);
    else if (update.fulfillment === "partial" && current.fulfillmentStatus === "UNFULFILLED")
      await setFulfillmentStatus(order.id, "PACKED", null, `partly fulfilled in ${label}`);
  }

  if (update.refund) {
    if (storeCheckout) {
      const status = update.refund === "full" ? "REFUNDED" : "PARTIALLY_REFUNDED";
      const { count } = await prisma.shopOrder.updateMany({
        where: { id: order.id, paymentStatus: { notIn: [status, "REFUNDED"] } },
        data: { paymentStatus: status },
      });
      if (count)
        await addOrderEvent(
          order.id,
          "refunded",
          update.refund === "full" ? `Refunded in ${label}` : `Partly refunded in ${label}`,
        );
    } else {
      await addEventOnce(
        order.id,
        `Refunded in ${label}, but RateUp took the payment — refund it from this order so the customer gets the money back`,
      );
    }
  }
  return prisma.shopOrder.findUnique({ where: { id: order.id } });
}

/** A store resends an order on every update; the same warning is kept once. */
async function addEventOnce(orderId: string, message: string) {
  const seen = await prisma.shopOrderEvent.count({
    where: { orderId, type: "needs_review", message },
  });
  if (!seen) await addOrderEvent(orderId, "needs_review", message);
}
