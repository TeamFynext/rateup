/**
 * WooCommerce orders as the commerce layer and the automation engine see them:
 * the status map, the conversion to a `CommerceOrder` and template variables.
 * Pure — no Redis, no database — so the rule schema and the automation engine
 * can import it without pulling in the order pipeline.
 */
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

import type { StoreTotals } from "../../commerce/shop/externalCheckout.service.js";
import type { CommerceOrder, CommerceOrderStatus } from "../commerce/commerce.types.js";
import type { WooCredential } from "./woocommerce.types.js";

/**
 * WooCommerce's order statuses onto the commerce layer's. The Woo status itself
 * stays the order's `eventKey` — it is what automation rules pick — so
 * `pending` and `on-hold` can share `created` without becoming the same event.
 *
 * `processing` is WooCommerce's "paid, not yet shipped"; `completed` is
 * "shipped", hence `fulfilled`. Anything else (`checkout-draft`, a status a
 * plugin added) is ignored.
 */
export const WOO_ORDER_STATUS: Readonly<Record<string, CommerceOrderStatus>> = {
  pending: "created",
  "on-hold": "created",
  processing: "paid",
  completed: "fulfilled",
  cancelled: "cancelled",
  refunded: "refunded",
  failed: "failed",
};

/** The statuses automation rules can trigger on, as the plan lists them. */
export const WOO_TRIGGER_STATUSES = [
  "processing",
  "completed",
  "cancelled",
  "refunded",
  "failed",
  "on-hold",
] as const;

export type WooTriggerStatus = (typeof WOO_TRIGGER_STATUSES)[number];

/** The parts of a WooCommerce order (REST v3) this integration reads. */
interface WooAddressPayload {
  first_name?: string;
  last_name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  phone?: string;
  country?: string;
}

export interface WooOrderPayload {
  id?: number;
  number?: string;
  status?: string;
  currency?: string;
  total?: string;
  /** Set once WooCommerce counts the order paid; a cash order has none until then. */
  date_paid?: string | null;
  discount_total?: string;
  shipping_total?: string;
  total_tax?: string;
  date_modified_gmt?: string;
  customer_id?: number;
  billing?: WooAddressPayload & { email?: string };
  shipping?: WooAddressPayload;
  refunds?: Array<{ id?: number; total?: string }>;
  line_items?: Array<{
    product_id?: number;
    variation_id?: number;
    name?: string;
    quantity?: number;
    subtotal?: string;
    image?: { src?: string };
  }>;
  coupon_lines?: Array<{ code?: string }>;
  [key: string]: unknown;
}

/** The country part of `woocommerce_default_country` ("IN:KL" → "IN"). */
function storeCountry(credential: WooCredential): string | undefined {
  return credential.store?.country?.split(":")[0] || undefined;
}

/**
 * The customer's phone in E.164, parsed against the billing country, then the
 * store's, then India. WooCommerce stores the number exactly as typed at
 * checkout — "09876 543210", "+91-98765…" — and the survey and automation paths
 * send to whatever arrives here. An unparseable number is passed through raw.
 */
export function normaliseWooPhone(
  raw: string | undefined,
  countries: Array<string | undefined>,
): string | null {
  const phone = raw?.trim();
  if (!phone) return null;
  for (const country of [...countries, "IN"]) {
    if (!country) continue;
    const parsed = parsePhoneNumberFromString(phone, country.toUpperCase() as CountryCode);
    if (parsed?.isValid()) return parsed.number;
  }
  return phone;
}

export function toCommerceOrder(
  payload: WooOrderPayload,
  credential: WooCredential,
  deliveryId: string | null,
): CommerceOrder | null {
  const eventKey = payload.status ?? "";
  const status = WOO_ORDER_STATUS[eventKey];
  if (!status) return null;

  const amount = Number(payload.total);
  const billing = payload.billing ?? {};

  return {
    orderId: payload.id === undefined ? null : String(payload.id),
    status,
    eventKey,
    customer: {
      phone: normaliseWooPhone(billing.phone || payload.shipping?.phone, [
        billing.country,
        payload.shipping?.country,
        storeCountry(credential),
      ]),
      email: billing.email?.trim() || null,
    },
    amount: Number.isFinite(amount) ? amount : null,
    productIds: [
      ...new Set(
        (payload.line_items ?? [])
          .map((item) => item.product_id)
          .filter((id): id is number => typeof id === "number" && id > 0)
          .map(String),
      ),
    ],
    // WooCommerce lower-cases every coupon code it stores; RateUp's redemption
    // codes are upper case, and they are looked up exactly.
    discountCodes: (payload.coupon_lines ?? [])
      .map((line) => line.code?.trim().toUpperCase())
      .filter((code): code is string => Boolean(code)),
    ...(deliveryId && { deliveryId }),
    raw: payload,
    rateupWriteBack: isRateupWriteBack(payload),
  };
}

/**
 * A dot path into the order for a template variable: `billing.first_name`,
 * `line_items.0.name`, `total`. Plus a few computed ones a template usually
 * wants and the payload does not hold as a single field.
 */
export function resolveWooPathValue(
  payload: Record<string, unknown> | null | undefined,
  path: string,
): string {
  if (!payload) return "";
  const order = payload as WooOrderPayload;

  if (path === "customer_name") {
    return [order.billing?.first_name, order.billing?.last_name].filter(Boolean).join(" ");
  }
  if (path === "items") {
    return (order.line_items ?? [])
      .map((item) => `${item.name ?? ""} (x${item.quantity ?? 1})`)
      .join(", ");
  }

  let value: unknown = payload;
  for (const key of path.split(".")) {
    if (value === null || typeof value !== "object") return "";
    value = (value as Record<string, unknown>)[key];
  }
  return value === null || value === undefined || typeof value === "object" ? "" : String(value);
}

/** The parts of a `customer.*` delivery a contact is built from. */
export interface WooCustomerPayload {
  id?: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  billing?: { first_name?: string; last_name?: string; phone?: string; country?: string };
  shipping?: { phone?: string; country?: string };
  [key: string]: unknown;
}

export interface WooContact {
  externalId: string;
  name: string | null;
  /** As `Contact.phone` holds it: E.164 digits without the `+`. */
  phone: string;
  email: string | null;
}

/**
 * A WooCommerce customer as a RateUp contact, or why it cannot be one. A
 * contact is keyed on its number, so a customer without a valid one — anyone
 * who registered under My Account rather than at checkout — is skipped.
 */
export function toWooContact(
  payload: WooCustomerPayload,
  credential: WooCredential,
): WooContact | { skipped: "no_id" | "no_phone" } {
  if (!payload.id) return { skipped: "no_id" };

  const billing = payload.billing ?? {};
  const phone = normaliseWooPhone(billing.phone || payload.shipping?.phone, [
    billing.country,
    payload.shipping?.country,
    storeCountry(credential),
  ]);
  // normaliseWooPhone passes an unparseable number through; a contact needs a real one.
  if (!phone?.startsWith("+")) return { skipped: "no_phone" };

  const name =
    [payload.first_name, payload.last_name]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ") ||
    [billing.first_name, billing.last_name]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ") ||
    null;

  return {
    externalId: String(payload.id),
    name,
    phone: phone.slice(1),
    email: payload.email?.trim() || null,
  };
}

/** Set on every order RateUp creates in WooCommerce; see `woocommerce.shopOrders.ts`. */
export const RATEUP_ORDER_META = "rateup_order_id";
/** Marks an order RateUp took the payment for and copied in, so its echo earns no points. */
export const RATEUP_WRITEBACK_META = "rateup_writeback";

const metaValue = (payload: object, key: string) => {
  const meta = (payload as { meta_data?: unknown }).meta_data;
  if (!Array.isArray(meta)) return null;
  const entry = (meta as Array<{ key?: unknown; value?: unknown }>).find((m) => m?.key === key);
  return typeof entry?.value === "string" ? entry.value : null;
};

export const isRateupWriteBack = (payload: object) =>
  metaValue(payload, RATEUP_WRITEBACK_META) === "1";

/** The RateUp order a WooCommerce order delivery belongs to, when RateUp created it. */
export function rateupOrderIdOf(payload: object): string | null {
  return metaValue(payload, RATEUP_ORDER_META);
}

/**
 * WooCommerce keeps every amount but the total before tax (line subtotals before coupons too),
 * so subtotal − discount + shipping + tax adds up to the total whatever the store's tax display.
 */
export function wooTotals(payload: WooOrderPayload): StoreTotals {
  const n = (v: unknown) => Number(v) || 0;
  return {
    subtotal: (payload.line_items ?? []).reduce((sum, line) => sum + n(line.subtotal), 0),
    discountTotal: n(payload.discount_total),
    shippingTotal: n(payload.shipping_total),
    taxTotal: n(payload.total_tax),
    total: n(payload.total),
  };
}

/** The customer and address WooCommerce holds for an order, as a RateUp order keeps them. */
export function wooCustomer(payload: WooOrderPayload) {
  const billing = payload.billing ?? {};
  const ship = payload.shipping?.address_1 ? payload.shipping : billing;
  const name = [billing.first_name, billing.last_name].filter(Boolean).join(" ") || null;
  return {
    customer: { name, email: billing.email?.trim() || null, phone: billing.phone || null },
    address: ship.address_1
      ? {
          name: [ship.first_name, ship.last_name].filter(Boolean).join(" ") || name || undefined,
          line1: ship.address_1,
          line2: ship.address_2 || undefined,
          city: ship.city,
          region: ship.state,
          postalCode: ship.postcode,
          country: ship.country?.toUpperCase(),
          phone: ship.phone || undefined,
        }
      : null,
  };
}
