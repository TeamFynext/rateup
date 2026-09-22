import dayjs from "dayjs";
import { ShopifyEvents, ShopifySendAfter } from "../../../types/enums.js";
import { SubscriptionStatus } from "../../../../generated/prisma/client.js";

export const ShopifyOrderWebhookTopicEventMap = [
  { key: ShopifyEvents.ORDERS_CREATE, value: "orders/create" },
  { key: ShopifyEvents.DRAFT_ORDERS_CREATE, value: "draft_orders/create" },
  { key: ShopifyEvents.ORDERS_PAID, value: "orders/paid" },
  { key: ShopifyEvents.ORDERS_CANCELLED, value: "orders/cancelled" },
  { key: ShopifyEvents.ORDERS_FULFILLED, value: "orders/fulfilled" },
  {
    key: ShopifyEvents.ORDERS_PARTIALLY_FULFILLED,
    value: "orders/partially_fulfilled",
  },
  {
    key: ShopifyEvents.FULFILLMENT_ORDERS_CANCELLED,
    value: "fulfillment_orders/cancelled",
  },
];

export function getScheduledTime(sendAfter: ShopifySendAfter | undefined) {
  const currentTime = dayjs();
  let scheduledTime = dayjs();
  switch (sendAfter) {
    case ShopifySendAfter.OneHour:
      scheduledTime = currentTime.add(1, "hour");
      break;
    case ShopifySendAfter.TwoHour:
      scheduledTime = currentTime.add(2, "hour");
      break;
    case ShopifySendAfter.FiveHour:
      scheduledTime = currentTime.add(5, "hour");
      break;
    case ShopifySendAfter.TenHour:
      scheduledTime = currentTime.add(10, "hour");
      break;
    case ShopifySendAfter.OneDay:
      scheduledTime = currentTime.add(1, "day");
      break;
    case ShopifySendAfter.TwoDays:
      scheduledTime = currentTime.add(2, "days");
      break;
  }
  return scheduledTime.toDate();
}

export enum shopifyRecurringChargeStatus {
  pending = "PENDING",
  active = "ACTIVE",
  declined = "DECLINED",
  expired = "EXPIRED",
  frozen = "FROZEN",
  cancelled = "CANCELLED",
}

// BUG (fixed): this map's keys used to be lowercase ("pending", "active", ...)
// but the only value ever indexed into it — the GraphQL `AppSubscription.status`
// field read from Shopify's Admin API in shopify.service.ts's
// `activateSubscriptionThroughShopify` — is one of Shopify's real
// AppSubscriptionStatus enum values, which are UPPERCASE ("ACTIVE", "PENDING",
// etc, matching `shopifyRecurringChargeStatus` above). The lowercase keys meant
// the lookup always missed and `subscriptionStatus` was silently `undefined` on
// every Shopify-driven subscription activation. Keyed by the enum itself so the
// keys are guaranteed to match what's actually looked up.
export const shopifyRecurringChargeSubscriptionStatusMap: Record<
  shopifyRecurringChargeStatus,
  SubscriptionStatus
> = {
  [shopifyRecurringChargeStatus.pending]: SubscriptionStatus.pending,
  [shopifyRecurringChargeStatus.active]: SubscriptionStatus.active,
  [shopifyRecurringChargeStatus.declined]: SubscriptionStatus.none,
  [shopifyRecurringChargeStatus.expired]: SubscriptionStatus.expired,
  [shopifyRecurringChargeStatus.frozen]: SubscriptionStatus.halted,
  [shopifyRecurringChargeStatus.cancelled]: SubscriptionStatus.cancelled,
};
// name should change according to whatsapp plan displaname. also in shopify app listing
export const ShopifyPlanMap = {
  free: {
    name: "FREE PLAN",
    id: 89502,
  },
  essential: {
    name: "Essential",
    id: 89571,
  },
  plus: {
    name: "Plus",
    id: 89571,
  },
  pro: {
    name: "Pro",
    id: 89600,
  },
};

export enum PaymentSource {
  Razorpay = "Razorpay",
  Stripe = "Stripe",
  Shopify = "Shopify",
}

/**
 * Shopify zone codes for India, keyed by the state name normalized to bare
 * lowercase letters. From Shopify's worldwide address data (data/regions/IN.yml),
 * including its alternates; a few codes differ from ISO 3166-2 (OR, TS, UK, CG).
 */
const INDIA_PROVINCE_CODES: Record<string, string> = {
  andamanandnicobar: "AN",
  andamanandnicobarislands: "AN",
  andamannicobar: "AN",
  andhrapradesh: "AP",
  arunachalpradesh: "AR",
  assam: "AS",
  bihar: "BR",
  chandigarh: "CH",
  chattisgarh: "CG",
  chhattisgarh: "CG",
  ct: "CG",
  dadraandnagarhaveli: "DN",
  dadraandnagarhavelianddamananddiu: "DN",
  dadranagarhaveli: "DN",
  damananddiu: "DD",
  damandiu: "DD",
  delhi: "DL",
  goa: "GA",
  gujarat: "GJ",
  haryana: "HR",
  himachalpradesh: "HP",
  jammuandkashmir: "JK",
  jammukashmir: "JK",
  jharkhand: "JH",
  karnataka: "KA",
  kerala: "KL",
  ladakh: "LA",
  lakshadweep: "LD",
  madhyapradesh: "MP",
  maharashtra: "MH",
  manipur: "MN",
  meghalaya: "ML",
  mizoram: "MZ",
  nagaland: "NL",
  nctofdelhi: "DL",
  newdelhi: "DL",
  od: "OR",
  odisha: "OR",
  orissa: "OR",
  pondicherry: "PY",
  puducherry: "PY",
  punjab: "PB",
  rajasthan: "RJ",
  sikkim: "SK",
  tamilnadu: "TN",
  telangana: "TS",
  tg: "TS",
  tripura: "TR",
  ut: "UK",
  uttarakhand: "UK",
  uttaranchal: "UK",
  uttarpradesh: "UP",
  westbengal: "WB",
};
const INDIA_CODES = new Set([
  "AN",
  "AP",
  "AR",
  "AS",
  "BR",
  "CG",
  "CH",
  "DD",
  "DL",
  "DN",
  "GA",
  "GJ",
  "HP",
  "HR",
  "JH",
  "JK",
  "KA",
  "KL",
  "LA",
  "LD",
  "MH",
  "ML",
  "MN",
  "MP",
  "MZ",
  "NL",
  "OR",
  "PB",
  "PY",
  "RJ",
  "SK",
  "TN",
  "TR",
  "TS",
  "UK",
  "UP",
  "WB",
]);

/**
 * GraphQL's MailingAddressInput takes only `provinceCode`, while the WhatsApp
 * address flow collects the state as free text. Returns undefined when the
 * state can't be resolved, so the address is sent without one rather than
 * with a code Shopify would reject.
 */
export function toShopifyProvinceCode(
  countryCode: string | undefined,
  province: string | undefined,
): string | undefined {
  if (!province) return undefined;
  const trimmed = province.trim();
  if ((countryCode ?? "IN").toUpperCase() !== "IN") {
    return /^[A-Za-z0-9]{1,3}$/.test(trimmed) ? trimmed.toUpperCase() : undefined;
  }
  if (INDIA_CODES.has(trimmed.toUpperCase())) return trimmed.toUpperCase();
  return INDIA_PROVINCE_CODES[trimmed.toLowerCase().replace(/[^a-z]/g, "")];
}
