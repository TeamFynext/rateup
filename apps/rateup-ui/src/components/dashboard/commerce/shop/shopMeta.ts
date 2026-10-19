import type { TFunction } from "i18next";

import type {
  ShopChannel,
  ShopDiscount,
  ShopDiscountState,
  ShopFulfillmentStatus,
  ShopOrder,
  ShopPaymentStatus,
  ShopProduct,
  ShopProductStatus,
} from "@/backend/commerce/shop.api";
import { formatMoney, toMoney } from "@/backend/commerce/shop.api";

export type Tone = "ok" | "warn" | "info" | "mute" | "err";

export const SHOP_PATHS = {
  setup: "/dashboard/commerce/setup",
  overview: "/dashboard/commerce/overview",
  products: "/dashboard/commerce/products",
  newProduct: "/dashboard/commerce/products/new",
  product: "/dashboard/commerce/products/$productId",
  orders: "/dashboard/commerce/orders",
  order: "/dashboard/commerce/orders/$orderId",
  coupons: "/dashboard/commerce/coupons",
  settings: "/dashboard/commerce/settings",
  storefrontPreview: "/dashboard/commerce/settings/storefront-preview",
  catalogs: "/dashboard/commerce/catalogs",
  catalogOrders: "/dashboard/commerce/catalog-orders",
  connectWhatsapp: "/dashboard/settings/channels/$channel",
} as const;

export const SETTINGS_TABS = [
  "payments",
  "delivery",
  "checkout",
  "store",
  "messages",
  "legacy",
] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

/** A link to one tab of Commerce → Settings. */
export const settingsTab = (tab: SettingsTab) => ({
  to: SHOP_PATHS.settings,
  search: { tab },
});

export function settingsTabLabel(t: TFunction, tab: SettingsTab): string {
  switch (tab) {
    case "payments":
      return t("Getting paid");
    case "delivery":
      return t("Delivery");
    case "checkout":
      return t("Checkout");
    case "store":
      return t("Store");
    case "messages":
      return t("Customer messages");
    case "legacy":
      return t("Legacy catalog");
  }
}

// Literal `t("…")` calls throughout, so the translation extractor sees every string.

export function channelLabel(t: TFunction, channel: ShopChannel): string {
  switch (channel) {
    case "WHATSAPP":
      return t("WhatsApp");
    case "INSTAGRAM":
      return t("Instagram");
    case "MESSENGER":
      return t("Messenger");
    case "STOREFRONT":
      return t("Storefront");
    case "MANUAL":
      return t("Manual");
  }
}

export function paymentBadge(
  t: TFunction,
  status: ShopPaymentStatus,
): { label: string; tone: Tone } {
  switch (status) {
    case "UNPAID":
      return { label: t("Unpaid"), tone: "mute" };
    case "PENDING":
      return { label: t("Link sent"), tone: "info" };
    case "PAID":
      return { label: t("Paid"), tone: "ok" };
    case "PARTIALLY_REFUNDED":
      return { label: t("Partly refunded"), tone: "warn" };
    case "REFUNDED":
      return { label: t("Refunded"), tone: "err" };
    case "FAILED":
      return { label: t("Payment failed"), tone: "err" };
    case "EXPIRED":
      return { label: t("Expired"), tone: "mute" };
    case "COD_PENDING":
      return { label: t("Cash on delivery"), tone: "warn" };
  }
}

export function fulfillmentBadge(
  t: TFunction,
  order: Pick<ShopOrder, "fulfillmentStatus" | "paymentStatus">,
): { label: string; tone: Tone } {
  return fulfillmentStatusBadge(t, order.fulfillmentStatus, order.paymentStatus);
}

export function fulfillmentStatusBadge(
  t: TFunction,
  status: ShopFulfillmentStatus,
  paymentStatus?: ShopPaymentStatus,
): { label: string; tone: Tone } {
  switch (status) {
    case "UNFULFILLED":
      return paymentStatus === "PAID"
        ? { label: t("To pack"), tone: "warn" }
        : { label: t("Unfulfilled"), tone: "mute" };
    case "PACKED":
      return { label: t("Packed"), tone: "info" };
    case "SHIPPED":
      return { label: t("Shipped"), tone: "info" };
    case "OUT_FOR_DELIVERY":
      return { label: t("Out for delivery"), tone: "info" };
    case "DELIVERED":
      return { label: t("Delivered"), tone: "ok" };
    case "FAILED_DELIVERY":
      return { label: t("Delivery failed"), tone: "err" };
    case "RETURNED":
      return { label: t("Returned"), tone: "mute" };
    case "CANCELLED":
      return { label: t("Cancelled"), tone: "mute" };
  }
}

export function productStatusBadge(
  t: TFunction,
  status: ShopProductStatus,
): { label: string; tone: Tone } {
  switch (status) {
    case "ACTIVE":
      return { label: t("Active"), tone: "ok" };
    case "DRAFT":
      return { label: t("Draft"), tone: "mute" };
    case "ARCHIVED":
      return { label: t("Archived"), tone: "mute" };
  }
}

export function discountStateBadge(
  t: TFunction,
  state: ShopDiscountState,
): { label: string; tone: Tone } {
  switch (state) {
    case "ACTIVE":
      return { label: t("Active"), tone: "ok" };
    case "SCHEDULED":
      return { label: t("Scheduled"), tone: "info" };
    case "ENDS_SOON":
      return { label: t("Ends soon"), tone: "warn" };
    case "ENDED":
      return { label: t("Ended"), tone: "mute" };
    case "USED_UP":
      return { label: t("Used up"), tone: "mute" };
    case "OFF":
      return { label: t("Off"), tone: "mute" };
  }
}

export function discountSourceLabel(t: TFunction, source: ShopDiscount["source"]): string {
  switch (source) {
    case "MANUAL":
      return t("Created here");
    case "LOYALTY":
      return t("Loyalty reward");
    case "CART_REMINDER":
      return t("Cart reminder");
    case "COD_PREPAID":
      return t("Pay-online offer");
  }
}

export function describeDiscount(t: TFunction, d: ShopDiscount, currency: string): string {
  const min = d.minSubtotal !== null && toMoney(d.minSubtotal) > 0 ? toMoney(d.minSubtotal) : null;
  let what: string;
  switch (d.type) {
    case "PERCENTAGE":
      what = t("{value}% off", { value: toMoney(d.value) });
      break;
    case "FIXED":
      what = t("{amount} off", { amount: formatMoney(d.value, currency) });
      break;
    case "FREE_SHIPPING":
      what = t("Free shipping");
      break;
    case "BUY_X_GET_Y":
      what = t("Buy {buy} get {get}", { buy: d.buyQty ?? 1, get: d.getQty ?? 1 });
      break;
  }
  return min === null
    ? what
    : t("{discount} over {minimum}", { discount: what, minimum: formatMoney(min, currency) });
}

/** The API words the next step in English; this maps the known ones onto translatable copy. */
export function nextStepLabel(t: TFunction, step: string): string {
  switch (step) {
    case "Waiting for the address":
      return t("Waiting for the address");
    case "Waiting for a delivery choice":
      return t("Waiting for a delivery choice");
    case "Waiting on points":
      return t("Waiting on points");
    case "Waiting for payment":
      return t("Waiting for payment");
    case "Waiting for the customer to confirm":
      return t("Waiting for the customer to confirm");
    case "Delivery failed — arrange a new slot":
      return t("Delivery failed, arrange a new slot");
    case "Pack and ship":
      return t("Pack and ship");
    case "Add tracking and ship":
      return t("Add tracking and ship");
    case "On its way":
      return t("On its way");
    case "Delivered":
      return t("Delivered");
    default:
      return step;
  }
}

export type SetupStepId =
  | "whatsapp"
  | "catalog"
  | "products"
  | "payments"
  | "checkout"
  | "shipping"
  | "test_order";

/** The setup checklist's steps, in the order the API sends and the setup page shows them. */
export const SETUP_STEP_IDS: readonly SetupStepId[] = [
  "whatsapp",
  "catalog",
  "products",
  "payments",
  "checkout",
  "shipping",
  "test_order",
];

/** The API sends the product count only inside its English step label ("12 products added"). */
export function setupProductCount(steps: readonly { id: string; label: string }[]): number {
  return Number(steps.find((s) => s.id === "products")?.label.match(/\d+/)?.[0] ?? 0);
}

export function setupStepTitle(t: TFunction, id: SetupStepId): string {
  switch (id) {
    case "whatsapp":
      return t("Connect WhatsApp");
    case "catalog":
      return t("Connect your Meta catalog");
    case "products":
      return t("Add a product");
    case "payments":
      return t("Choose how you get paid");
    case "checkout":
      return t("Choose where customers pay");
    case "shipping":
      return t("Set a delivery rate");
    case "test_order":
      return t("Try a test order");
  }
}

/** "24.00" or "18.00 – 32.00": a product's price, as a range when its variants differ. */
export function priceRange(product: ShopProduct, currency: string): string {
  const prices = product.variants.map((v) => toMoney(v.price));
  if (prices.length === 0) return "—";
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  return lo === hi
    ? formatMoney(lo, currency)
    : `${formatMoney(lo, currency)} – ${formatMoney(hi, currency)}`;
}

export function totalStock(product: ShopProduct): {
  tracked: boolean;
  stock: number;
  low: boolean;
} {
  const tracked = product.variants.filter((v) => v.trackInventory);
  if (tracked.length === 0) return { tracked: false, stock: 0, low: false };
  const stock = tracked.reduce((sum, v) => sum + v.stock, 0);
  const low = tracked.some((v) => v.lowStockAt !== null && v.stock > 0 && v.stock <= v.lowStockAt);
  return { tracked: true, stock, low };
}

/** Whole-number percent change, signed: "+12.4%". */
export function signedPercent(value: number, unit = "%"): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}${unit}`;
}

export function customerName(t: TFunction, name: string | null | undefined): string {
  return name?.trim() || t("Unknown customer");
}
