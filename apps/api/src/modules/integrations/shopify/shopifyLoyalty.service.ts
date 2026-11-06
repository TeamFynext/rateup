import { ShopifyEvents } from "../../../types/enums.js";
import type { CommerceOrderStatus } from "../commerce/commerce.types.js";
import {
  commerceAwardKey,
  commerceReversalKey,
  enqueueCommerceOrderLoyalty,
  processCommerceOrderLoyalty,
  type CommerceLoyaltyJobData,
  type CommerceLoyaltyOutcome,
} from "../commerce/loyalty.js";
import type { ShopifyBody } from "./shopify.types.js";
import { shopifyLoyaltyEnabled } from "./shopify.util.js";

/**
 * Loyalty points for Shopify orders: the Shopify half of `commerce/loyalty.ts`.
 *
 * What is left here is getting facts out of a Shopify payload. The decisions —
 * award on payment, reverse on cancellation, mark vouchers used — are the
 * commerce layer's, shared with every store.
 */

export interface ShopifyLoyaltyJobData {
  shop: string;
  topic: ShopifyEvents;
  orgId: string;
  orderId: string;
  phone: string | null;
  email: string | null;
  amount: number | null;
  /** Codes applied at checkout; a RateUp voucher among them is marked used. */
  discountCodes?: string[];
}

export type ShopifyLoyaltyOutcome = CommerceLoyaltyOutcome;

/** How a Shopify topic reads as an order status. */
export const SHOPIFY_ORDER_STATUS: Partial<Record<ShopifyEvents, CommerceOrderStatus>> = {
  [ShopifyEvents.DRAFT_ORDERS_CREATE]: "draft_created",
  [ShopifyEvents.ORDERS_CREATE]: "created",
  [ShopifyEvents.ORDERS_PAID]: "paid",
  [ShopifyEvents.ORDERS_PARTIALLY_FULFILLED]: "partially_fulfilled",
  [ShopifyEvents.ORDERS_FULFILLED]: "fulfilled",
  [ShopifyEvents.ORDERS_CANCELLED]: "cancelled",
  [ShopifyEvents.FULFILLMENT_ORDERS_CANCELLED]: "fulfillment_cancelled",
};

/** Shopify's loyalty settings, for the commerce layer. */
export const SHOPIFY_LOYALTY = {
  name: "shopify",
  label: "Shopify",
  loyaltyEnabled: shopifyLoyaltyEnabled,
};

export interface ShopifyOrderIdentity {
  orderId: string | null;
  /** Raw, un-normalised — the resolver parses it against the programme's country. */
  phone: string | null;
  email: string | null;
}

/** Shopify puts the customer's number in any of five places, depending on how they checked out. */
export function extractOrderIdentity(body: ShopifyBody): ShopifyOrderIdentity {
  const b = body as unknown as Record<string, any>;
  const phone =
    b?.customer?.phone ||
    b?.customer?.default_address?.phone ||
    b?.billing_address?.phone ||
    b?.shipping_address?.phone ||
    b?.phone ||
    null;

  // Email is the one Shopify actually insists on at checkout, and the old bridge ignored
  // it entirely — which is why orders from customers who never gave a phone number
  // silently earned nothing.
  const email = b?.customer?.email || b?.email || b?.contact_email || null;

  return { orderId: b?.id != null ? String(b.id) : null, phone, email };
}

/** The discount codes a customer applied at checkout, as typed. */
export function extractDiscountCodes(body: ShopifyBody): string[] {
  const codes = (body as unknown as { discount_codes?: { code?: unknown }[] | null })
    .discount_codes;
  return (codes ?? [])
    .map((c) => (typeof c?.code === "string" ? c.code.trim() : ""))
    .filter(Boolean);
}

/**
 * What the customer actually paid, in the shop's own currency.
 *
 * The previous version read `total_line_items_price_set.presentment_money`, which is wrong
 * twice over: `total_line_items_price` is the price *before* discounts, so a discounted
 * order over-awarded and a 100%-off order earned full points; and `presentment_money` is
 * the buyer's currency, so a store selling internationally awarded points on USD amounts
 * against rules and tier thresholds denominated in its own.
 *
 * Returns null rather than 0 when nothing parses, so the caller can say "we could not read
 * the amount" instead of booking a zero-value purchase.
 */
export function extractPurchaseAmount(body: ShopifyBody): number | null {
  const b = body as unknown as Record<string, any>;
  const candidates = [
    b?.current_subtotal_price_set?.shop_money?.amount,
    b?.subtotal_price_set?.shop_money?.amount,
    b?.current_subtotal_price,
    b?.subtotal_price,
    b?.total_price,
  ];
  for (const c of candidates) {
    if (c === null || c === undefined) continue;
    const n = Number(c);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

/** One key per order — the keys already on the ledger, so they must not change. */
export const awardKey = (shop: string, orderId: string) =>
  commerceAwardKey("shopify", shop, orderId);
export const reversalKey = (shop: string, orderId: string) =>
  commerceReversalKey("shopify", shop, orderId);

/** A Shopify loyalty job in the commerce layer's terms. */
export function toCommerceLoyaltyJob(data: ShopifyLoyaltyJobData): CommerceLoyaltyJobData {
  return {
    provider: "shopify",
    storeId: data.shop,
    // A topic this bridge does not map (none are queued today) reads as a
    // fulfilment cancel: the one status that changes nothing.
    status: SHOPIFY_ORDER_STATUS[data.topic] ?? "fulfillment_cancelled",
    eventKey: data.topic,
    orgId: data.orgId,
    orderId: data.orderId,
    phone: data.phone,
    email: data.email,
    amount: data.amount,
    discountCodes: data.discountCodes,
  };
}

export async function enqueueShopifyOrderLoyalty(data: ShopifyLoyaltyJobData) {
  await enqueueCommerceOrderLoyalty(toCommerceLoyaltyJob(data));
}

/**
 * Award or reverse, for one Shopify order event. Also what the worker runs for
 * a job queued in the old `{ shop, topic }` shape before the commerce layer.
 */
export async function processShopifyOrderLoyalty(
  job: ShopifyLoyaltyJobData,
): Promise<ShopifyLoyaltyOutcome> {
  return processCommerceOrderLoyalty(toCommerceLoyaltyJob(job), SHOPIFY_LOYALTY);
}
