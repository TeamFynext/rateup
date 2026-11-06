import dayjs from "dayjs";

import type {
  FulfillmentStatus,
  Money,
  OrderTab,
  PaymentStatus,
  ShopOrderBase,
  ShopVariant,
} from "@/api/shop/shop.type";
import { formatMoney, formatNumber } from "@/components/loyalty/cashier/logic/format";

export function money(amount: Money | null | undefined, currency: string): string {
  const value = Number(amount ?? 0);
  // The store's currency arrives with a second request; until then, a bare figure.
  if (!currency) return formatNumber(value, 2);
  return formatMoney(value, currency, `${currency} `);
}

export function orderNumber(order: Pick<ShopOrderBase, "number">): string {
  return `#${order.number}`;
}

export function orderDate(value: string | null | undefined): string {
  return value ? dayjs(value).format("D MMM, h:mm A") : "";
}

export const ORDER_TABS: readonly { value: OrderTab; label: string }[] = [
  { value: "needs_action", label: "Needs action" },
  { value: "awaiting_payment", label: "Awaiting payment" },
  { value: "to_pack", label: "To pack" },
  { value: "shipped", label: "Shipped" },
  { value: "all", label: "All" },
];

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  PENDING: "Payment pending",
  PAID: "Paid",
  PARTIALLY_REFUNDED: "Partly refunded",
  REFUNDED: "Refunded",
  FAILED: "Payment failed",
  EXPIRED: "Link expired",
  COD_PENDING: "Cash on delivery",
};

const FULFILLMENT_LABEL: Record<FulfillmentStatus, string> = {
  UNFULFILLED: "Not packed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  FAILED_DELIVERY: "Delivery failed",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
};

export type BadgeTone = "neutral" | "warm" | "good";

export function paymentBadge(status: PaymentStatus): { label: string; tone: BadgeTone } {
  const tone: BadgeTone =
    status === "PAID" ? "good" : status === "UNPAID" || status === "PENDING" ? "warm" : "neutral";
  return { label: PAYMENT_LABEL[status] ?? status, tone };
}

export function fulfillmentBadge(status: FulfillmentStatus): { label: string; tone: BadgeTone } {
  const tone: BadgeTone =
    status === "DELIVERED" ? "good" : status === "FAILED_DELIVERY" ? "warm" : "neutral";
  return { label: FULFILLMENT_LABEL[status] ?? status, tone };
}

/** "Draft cart" / "Cancelled" outrank payment and delivery, which no longer mean much. */
export function orderHeadline(order: ShopOrderBase): { label: string; tone: BadgeTone } {
  if (order.status === "CANCELLED") return { label: "Cancelled", tone: "neutral" };
  if (order.status === "DRAFT") return { label: "Open cart", tone: "warm" };
  if (order.paymentStatus === "PAID" || order.paymentStatus === "COD_PENDING") {
    return fulfillmentBadge(order.fulfillmentStatus);
  }
  return paymentBadge(order.paymentStatus);
}

export function variantLabel(variant: ShopVariant): string | null {
  return variant.title && variant.title !== "Default" ? variant.title : null;
}

export function isSoldOut(variant: ShopVariant): boolean {
  return variant.trackInventory && !variant.allowBackorder && variant.stock <= 0;
}
