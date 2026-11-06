/**
 * Shapes from rateup-api `src/modules/commerce/shop/`. Prisma `Decimal` columns arrive as
 * strings on these authenticated endpoints, so every money field is `Money` and goes
 * through `Number()` before arithmetic or display.
 */
export type Money = string | number;

export type ShopChannel = "WHATSAPP" | "INSTAGRAM" | "MESSENGER" | "STOREFRONT" | "MANUAL";
export type ChatChannel = "WHATSAPP" | "INSTAGRAM" | "MESSENGER";

export type OrderStatus = "DRAFT" | "OPEN" | "COMPLETED" | "CANCELLED";
export type PaymentStatus =
  | "UNPAID"
  | "PENDING"
  | "PAID"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "FAILED"
  | "EXPIRED"
  | "COD_PENDING";
export type FulfillmentStatus =
  | "UNFULFILLED"
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED_DELIVERY"
  | "RETURNED"
  | "CANCELLED";

export type OrderTab =
  | "all"
  | "needs_action"
  | "awaiting_payment"
  | "to_pack"
  | "shipped"
  | "delivered"
  | "returns"
  | "drafts"
  | "cancelled";

export interface ShopVariant {
  id: string;
  title: string;
  optionValues: Record<string, string> | null;
  sku: string | null;
  price: Money;
  compareAtPrice: Money | null;
  trackInventory: boolean;
  stock: number;
  allowBackorder: boolean;
  imageUrl: string | null;
  position: number;
}

export interface ShopProduct {
  id: string;
  title: string;
  description: string | null;
  images: string[];
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  showOnWhatsapp: boolean;
  showOnInstagram: boolean;
  showOnFacebook: boolean;
  metaSyncStatus: "NOT_SYNCED" | "SYNCING" | "LIVE" | "REJECTED" | "HIDDEN";
  variants: ShopVariant[];
}

export interface ProductList {
  items: ShopProduct[];
  total: number;
  page: number;
  limit: number;
}

export interface ShippingRate {
  id: string;
  zone: string;
  name: string;
  price: Money;
  freeOver: Money | null;
  minDays: number | null;
  maxDays: number | null;
  active: boolean;
}

/** Who takes the payment: RateUp, or the Shopify or WooCommerce store the shop follows. */
export type CheckoutVia = "RATEUP" | "SHOPIFY" | "WOOCOMMERCE";

export interface ShopStore {
  id: string;
  name: string;
  currency: string;
  checkoutVia: CheckoutVia;
  allowCoupons: boolean;
  codEnabled: boolean;
  shippingRates: ShippingRate[];
}

export interface ShippingAddress {
  name?: string | null;
  phone?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface ShopOrderBase {
  id: string;
  number: number | string;
  contactId: string | null;
  channel: ShopChannel;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  paymentMethod: string | null;
  /** Paid, fulfilled and refunded in that store when not RATEUP; RateUp follows it. */
  checkoutVia: CheckoutVia;
  externalProvider: string | null;
  externalName: string | null;
  currency: string;
  subtotal: Money;
  discountTotal: Money;
  pointsDiscount: Money;
  shippingTotal: Money;
  taxTotal: Money;
  total: Money;
  discountCode: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  shippingAddress: ShippingAddress | null;
  shippingRate: { name?: string; price?: Money } | null;
  note: string | null;
  staffNote: string | null;
  placedAt: string | null;
  paidAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

export interface OrderRow extends ShopOrderBase {
  items: { id: string; quantity: number }[];
  contact: {
    id: string;
    name: string | null;
    phone: string | null;
    whatsappUserName: string | null;
  } | null;
  nextStep: string;
}

export type OrderCounts = Partial<Record<OrderTab, number>>;

export interface OrderList {
  items: OrderRow[];
  total: number;
  page: number;
  limit: number;
  counts: OrderCounts;
}

export interface OrderItem {
  id: string;
  title: string;
  variantTitle: string | null;
  sku: string | null;
  imageUrl: string | null;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
}

export interface OrderEvent {
  type: string;
  message: string;
  createdAt: string;
  actorUserId: string | null;
}

export interface OrderShipment {
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: string | null;
  shippedAt: string | null;
}

export interface OrderPayment {
  provider: string;
  status: string;
  amount: Money;
  currency: string;
  linkUrl: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface OrderDetail extends ShopOrderBase {
  items: OrderItem[];
  payments: OrderPayment[];
  events: OrderEvent[];
  shipments: OrderShipment[];
  contact: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  nextStep: string;
  customerStats: { orders: number; spent: Money } | null;
  checkoutUrl: string | null;
}

export interface CreateOrderInput {
  contactId: string;
  channel: ChatChannel;
  channelAccountId?: string | null;
  items: { variantId: string; quantity: number }[];
  discountCode?: string | null;
  shippingRateId?: string | null;
  send: "payment_link" | "checkout_link" | "none";
}

export interface CreateOrderResult {
  order: ShopOrderBase;
  delivery: { sent: boolean; url?: string };
}

export interface PaymentLinkResult {
  url: string;
  /** Null when the order is paid on the store's checkout and that link was resent. */
  provider: string | null;
  amount: Money;
  currency: string;
  expiresAt: string | null;
  delivered: boolean;
  deliveryError: string | null;
}

export interface SendProductsInput {
  contactId: string;
  channel: ChatChannel;
  channelAccountId?: string | null;
  productIds: string[];
  text?: string;
}

export interface SendProductsResult {
  sent: number;
  skipped: number;
}
