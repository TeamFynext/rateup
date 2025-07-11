import dayjs from "dayjs";
import { ShopifyEvents, ShopifySendAfter } from "../../../types/enums";
import { SubscriptionStatus } from "../../../../generated/prisma/client";

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

export function getScheduledTime(sendAfter) {
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
    case ShopifySendAfter.OneDay:
      scheduledTime = currentTime.add(2, "days");
      break;
  }
  return scheduledTime.toDate();
}

export const shopifyRecurringChargeSubscriptionStatusMap = {
  pending: SubscriptionStatus.pending,
  active: SubscriptionStatus.active,
  declined: SubscriptionStatus.none,
  expired: SubscriptionStatus.expired,
  frozen: SubscriptionStatus.halted,
  cancelled: SubscriptionStatus.cancelled,
};

export enum shopifyRecurringChargeStatus {
  pending = "PENDING",
  active = "ACTIVE",
  declined = "DECLINED",
  expired = "EXPIRED",
  frozen = "FROZEN",
  cancelled = "CANCELLED",
}
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
