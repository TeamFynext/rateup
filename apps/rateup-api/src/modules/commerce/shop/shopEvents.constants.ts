/** Order events a shop emits; automation rules (`SHOP_ORDER_EVENT`) pick one. */
export const SHOP_ORDER_EVENTS = [
  "placed",
  "paid",
  "cod_confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "delivery_failed",
  "cancelled",
  "refunded",
] as const;

export type ShopOrderEventType = (typeof SHOP_ORDER_EVENTS)[number];
