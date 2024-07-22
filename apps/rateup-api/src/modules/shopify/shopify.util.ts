import dayjs from "dayjs";
import { ShopifyEvents, ShopifySendAfter } from "../../types/enums";

export const ShopifyWebhookTopicEventMap = [
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
  { key: ShopifyEvents.APP_UNINSTALLED, value: "app/uninstalled" },
];

export function getScheduledTime(sendAfter) {
  const currentTime = dayjs();
  let scheduledTime = dayjs();
  switch (sendAfter) {
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
  return scheduledTime.toISOString();
}
