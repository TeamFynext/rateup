import { axiosClient } from "@/backend/apiClient";

/**
 * The shop: products, orders, coupons, payments and the public storefront/checkout. Mirrors
 * `rateup-api/src/modules/commerce/shop/` (routes under `/shop` and `/public/shop`).
 *
 * Money from the authenticated endpoints is Prisma `Decimal`, which arrives as a string
 * ("24.00"); `Money` says so and `toMoney` reads it. The public endpoints send numbers.
 */
export type Money = string | number;
export const toMoney = (value: Money | null | undefined): number => {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export type ShopChannel = "WHATSAPP" | "INSTAGRAM" | "MESSENGER" | "STOREFRONT" | "MANUAL";
export type ShopProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";
export type ShopMetaSyncStatus = "NOT_SYNCED" | "SYNCING" | "LIVE" | "REJECTED" | "HIDDEN";
export type ShopOrderStatus = "DRAFT" | "OPEN" | "COMPLETED" | "CANCELLED";
export type ShopCheckoutStage = "ADDRESS" | "DELIVERY" | "LOYALTY" | "PAYMENT" | "DONE";
export type ShopPaymentStatus =
  | "UNPAID"
  | "PENDING"
  | "PAID"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "FAILED"
  | "EXPIRED"
  | "COD_PENDING";
export type ShopFulfillmentStatus =
  | "UNFULFILLED"
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED_DELIVERY"
  | "RETURNED"
  | "CANCELLED";
/** What staff may set; RETURNED and CANCELLED follow a return or a cancellation (fulfillmentSchema). */
export type ShopSettableFulfillmentStatus = Exclude<
  ShopFulfillmentStatus,
  "RETURNED" | "CANCELLED"
>;
export type ShopDiscountType = "PERCENTAGE" | "FIXED" | "FREE_SHIPPING" | "BUY_X_GET_Y";
export type ShopDiscountState = "ACTIVE" | "SCHEDULED" | "ENDS_SOON" | "ENDED" | "USED_UP" | "OFF";
export type PaymentProviderId = "stripe" | "razorpay";

export interface ShopAddress {
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  /** ISO 3166-1 alpha-2. */
  country?: string;
}

export interface ShopSelectedShipping {
  rateId: string | null;
  name: string;
  price: number;
  minDays?: number | null;
  maxDays?: number | null;
}

export interface ShopAttribution {
  kind: "ctwa_ad" | "ig_comment" | "ig_story" | "campaign" | "storefront" | "link";
  adId?: string;
  adTitle?: string;
  sourceUrl?: string;
  clickedAt?: string;
  freeWindowUntil?: string;
}

export type ShopNotificationEvent =
  | "placed"
  | "paid"
  | "cod_confirm"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "delivery_failed"
  | "cancelled"
  | "refunded"
  | "payment_reminder"
  | "cart_reminder"
  | "back_in_stock"
  | "review_request";

export interface ShopShippingRate {
  id: string;
  zone: string;
  countries: string[];
  name: string;
  minDays: number | null;
  maxDays: number | null;
  price: Money;
  freeOver: Money | null;
  active: boolean;
  position: number;
}

export interface ShopBankDetails {
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  routingCode?: string;
  instructions?: string;
}

export interface ShopStorefrontTheme {
  accent?: string;
  banner?: { eyebrow?: string; title?: string; subtitle?: string; imageUrl?: string } | null;
  instagramUrl?: string | null;
}

export interface ShopPaymentProvider {
  id: PaymentProviderId;
  label: string;
  connected: boolean;
  accountName: string | null;
  livemode: boolean | null;
  webhookUrl: string;
  webhookConfigured: boolean;
  /** When a signed webhook last arrived; null until the merchant's webhook setup works. */
  lastWebhookAt: string | null;
  isDefault: boolean;
  lastError: string | null;
}

export interface ShopPaymentMethods {
  providers: ShopPaymentProvider[];
  whatsappPay: { available: boolean; currencies: string[] };
  cod: {
    enabled: boolean;
    confirm: boolean;
    confirmHours: number;
    prepaidDiscountPct: number | null;
  };
  bankTransfer: { enabled: boolean; details: ShopBankDetails | null };
}

export type ShopCheckoutVia = "RATEUP" | "SHOPIFY" | "WOOCOMMERCE";

export interface ShopStore {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  mode: "NATIVE" | "SHOPIFY" | "WOOCOMMERCE";
  /** Whose checkout takes the payment; a store only when the products follow it. */
  checkoutVia: ShopCheckoutVia;
  currency: string;
  taxRate: Money | null;
  pricesIncludeTax: boolean;
  description: string | null;
  logoUrl: string | null;
  metaCatalogId: string | null;
  storefrontEnabled: boolean;
  storefrontTheme: ShopStorefrontTheme | null;
  askAddress: boolean;
  askDelivery: boolean;
  offerPoints: boolean;
  allowCoupons: boolean;
  pointValue: Money | null;
  minPointsToRedeem: number;
  maxPointsPct: number;
  codEnabled: boolean;
  codConfirm: boolean;
  codConfirmHours: number;
  codPrepaidDiscountPct: Money | null;
  bankTransferEnabled: boolean;
  bankTransferHours: number;
  bankDetails: ShopBankDetails | null;
  defaultPaymentProvider: PaymentProviderId | null;
  paymentLinkTtlHours: number;
  cartReminderMinutes: number[];
  cartReminderDiscountId: string | null;
  notifications: Partial<
    Record<ShopNotificationEvent, { enabled?: boolean; waTemplateId?: string | null }>
  > | null;
  lowStockThreshold: number;
  invoiceAutoSend: boolean;
  invoicePrefix: string;
  taxId: string | null;
  /** Printed on invoices, one line per line. */
  businessAddress: string | null;
  /** Last time products were copied in from the store this shop follows. */
  mirroredAt: string | null;
  /** Present on GET /shop/store only. */
  storefrontUrl?: string;
  shippingRates?: ShopShippingRate[];
  catalogs?: { catalogId: string; name: string | null }[];
  payments?: ShopPaymentMethods;
  whatsapp?: ShopWhatsappStatus;
  /** Whether the store this shop follows is still connected; null for a shop of its own. */
  externalStoreConnected?: boolean | null;
  /** Shopify or WooCommerce stores connected to the org, which the shop could follow. */
  connectedStores?: ("shopify" | "woocommerce")[];
  /** Active products made in RateUp, hidden while customers pay on the store's checkout. */
  ownProductsHidden?: number;
}

export type ShopStoreUpdate = Partial<{
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  currency: string;
  taxRate: number | null;
  pricesIncludeTax: boolean;
  metaCatalogId: string | null;
  storefrontEnabled: boolean;
  storefrontTheme: ShopStorefrontTheme | null;
  askAddress: boolean;
  askDelivery: boolean;
  offerPoints: boolean;
  allowCoupons: boolean;
  pointValue: number | null;
  minPointsToRedeem: number;
  maxPointsPct: number;
  codEnabled: boolean;
  codConfirm: boolean;
  codConfirmHours: number;
  codPrepaidDiscountPct: number | null;
  bankTransferEnabled: boolean;
  bankTransferHours: number;
  bankDetails: ShopBankDetails | null;
  defaultPaymentProvider: PaymentProviderId | null;
  checkoutVia: ShopCheckoutVia;
  paymentLinkTtlHours: number;
  cartReminderMinutes: number[];
  cartReminderDiscountId: string | null;
  lowStockThreshold: number;
  notifications: ShopStore["notifications"];
  invoiceAutoSend: boolean;
  invoicePrefix: string;
  taxId: string | null;
  businessAddress: string | null;
}>;

export interface ShopShippingRateInput {
  zone: string;
  countries: string[];
  name: string;
  minDays?: number | null;
  maxDays?: number | null;
  price: number;
  freeOver?: number | null;
  active: boolean;
  position: number;
}

// ─── Products ────────────────────────────────────────────────────────────────

export interface ShopVariant {
  id: string;
  productId: string;
  title: string;
  optionValues: Record<string, string> | null;
  sku: string | null;
  retailerId: string;
  price: Money;
  compareAtPrice: Money | null;
  trackInventory: boolean;
  stock: number;
  lowStockAt: number | null;
  allowBackorder: boolean;
  imageUrl: string | null;
  weightGrams: number | null;
  position: number;
  /** On GET /shop/products/:id: people waiting for a restock message. */
  _count?: { stockAlerts: number };
}

export interface ShopProductOption {
  name: string;
  values: string[];
}

export interface ShopProduct {
  id: string;
  storeId: string;
  title: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  productUrl: string | null;
  images: string[];
  status: ShopProductStatus;
  options: ShopProductOption[] | null;
  showOnWhatsapp: boolean;
  showOnInstagram: boolean;
  showOnFacebook: boolean;
  showOnStorefront: boolean;
  loyaltyMultiplier: Money;
  externalSource: string | null;
  metaSyncStatus: ShopMetaSyncStatus;
  metaSyncError: string | null;
  metaSyncedAt: string | null;
  collections: { id: string; name: string; slug: string }[];
  variants: ShopVariant[];
  updatedAt: string;
  /** On the list only. */
  sold30d?: number;
}

export interface ShopVariantInput {
  id?: string;
  title?: string;
  optionValues?: Record<string, string> | null;
  sku?: string | null;
  price: number;
  compareAtPrice?: number | null;
  trackInventory?: boolean;
  /** Read on create only; later changes go through `setVariantStock`. */
  stock?: number;
  lowStockAt?: number | null;
  allowBackorder?: boolean;
  imageUrl?: string | null;
  weightGrams?: number | null;
}

export interface ShopProductInput {
  title: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  productUrl?: string | null;
  images?: string[];
  status?: ShopProductStatus;
  options?: ShopProductOption[] | null;
  showOnWhatsapp?: boolean;
  showOnInstagram?: boolean;
  showOnFacebook?: boolean;
  showOnStorefront?: boolean;
  loyaltyMultiplier?: number;
  collectionIds?: string[];
  variants: ShopVariantInput[];
}

export interface ShopProductQuery {
  status?: ShopProductStatus;
  search?: string;
  collectionId?: string;
  filter?: "low_stock" | "sold_out" | "sync_errors";
  channel?: "whatsapp" | "instagram" | "storefront";
  /** Comma-separated catalog ids. */
  retailerIds?: string;
  /** "1": only what can be sold now (a store-checkout shop's own products are left out). */
  sellable?: "1";
  page?: number;
  limit?: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ShopCollection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  position: number;
  _count?: { products: number };
}

export interface StockMovement {
  id: string;
  delta: number;
  reason: "ORDER" | "CANCEL" | "RETURN" | "ADJUSTMENT" | "SYNC";
  orderId: string | null;
  userId: string | null;
  note: string | null;
  createdAt: string;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export interface ShopOrder {
  id: string;
  storeId: string;
  number: number;
  contactId: string | null;
  channel: ShopChannel;
  source: string | null;
  channelAccountId: string | null;
  status: ShopOrderStatus;
  checkoutStage: ShopCheckoutStage;
  paymentStatus: ShopPaymentStatus;
  fulfillmentStatus: ShopFulfillmentStatus;
  paymentMethod: string | null;
  /** Paid on the merchant's own Shopify or WooCommerce checkout, not RateUp's. */
  checkoutVia: ShopCheckoutVia;
  /** The store's order (or draft) this one was sent to or written back to. */
  externalProvider: string | null;
  externalId: string | null;
  /** The store's own name for it, e.g. "#1001". */
  externalName: string | null;
  currency: string;
  subtotal: Money;
  discountTotal: Money;
  pointsDiscount: Money;
  pointsRedeemed: number;
  shippingTotal: Money;
  taxTotal: Money;
  total: Money;
  discountCode: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  shippingAddress: ShopAddress | null;
  shippingRate: ShopSelectedShipping | null;
  attribution: ShopAttribution | null;
  /** When the sale reached Meta's Conversions API as a Purchase for the ad click. */
  adConversionSentAt?: string | null;
  invoiceNumber: string | null;
  /** Whether the PDF exists; its link is fetched on demand because it expires. Not in lists. */
  hasInvoice?: boolean;
  invoiceIssuedAt: string | null;
  invoiceSentAt: string | null;
  /** Paid, but stock, a coupon or points ran out before it placed; staff should look. */
  reviewReason?: string | null;
  /** What the customer was given (coupon, points) that the order could not cover. */
  amountDue?: Money | null;
  note: string | null;
  staffNote: string | null;
  reminderCount: number;
  placedAt: string | null;
  paidAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ShopOrderTab =
  | "all"
  | "needs_action"
  | "awaiting_payment"
  | "to_pack"
  | "shipped"
  | "delivered"
  | "returns"
  | "drafts"
  | "cancelled";

export interface ShopOrderRow extends ShopOrder {
  items: { id: string; quantity: number }[];
  contact: {
    id: string;
    name: string | null;
    phone: string | null;
    whatsappUserName: string | null;
  } | null;
  nextStep: string;
}

export interface ShopOrderQuery {
  tab?: ShopOrderTab;
  search?: string;
  channel?: ShopChannel;
  paymentStatus?: ShopPaymentStatus;
  contactId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface ShopOrderItem {
  id: string;
  variantId: string | null;
  productId: string | null;
  title: string;
  variantTitle: string | null;
  sku: string | null;
  retailerId: string | null;
  imageUrl: string | null;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
}

export interface ShopPayment {
  id: string;
  provider: string;
  status: ShopPaymentStatus;
  amount: Money;
  currency: string;
  linkUrl: string | null;
  providerPaymentId: string | null;
  refundedAmount: Money;
  expiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface ShopOrderEvent {
  id: string;
  type: string;
  message: string;
  actorUserId: string | null;
  createdAt: string;
}

export interface ShopShipment {
  id: string;
  provider: string;
  carrier: string | null;
  service: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  status: ShopFulfillmentStatus;
  shippedAt: string | null;
  deliveredAt: string | null;
}

export interface ShopReturn {
  id: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "RECEIVED" | "REFUNDED";
  reason: string;
  items: { orderItemId: string; quantity: number }[];
  refundAmount: Money | null;
  note: string | null;
  createdAt: string;
}

export interface ShopOrderDetail extends ShopOrder {
  items: ShopOrderItem[];
  payments: ShopPayment[];
  events: ShopOrderEvent[];
  shipments: ShopShipment[];
  returns: ShopReturn[];
  contact: {
    id: string;
    name: string | null;
    phone: string | null;
    igsId: string | null;
    psid: string | null;
    email: string | null;
    profilePic: string | null;
  } | null;
  nextStep: string;
  customerStats: { orders: number; spent: number } | null;
  loyalty: { points: number; tier: string | null } | null;
  /** RateUp's checkout page; for a store checkout it sends the customer on to the store. */
  checkoutUrl: string | null;
  /** The order in the Shopify or WooCommerce admin. */
  externalAdminUrl: string | null;
}

export interface CreateShopOrderInput {
  contactId: string;
  channel: "WHATSAPP" | "INSTAGRAM" | "MESSENGER" | "MANUAL";
  channelAccountId?: string | null;
  items: { variantId: string; quantity: number }[];
  discountCode?: string | null;
  shippingRateId?: string | null;
  send: "payment_link" | "checkout_link" | "none";
}

export interface PaymentLinkResult {
  url: string;
  /** Null when the order is paid on the shop's own store checkout and its link was resent. */
  provider: PaymentProviderId | null;
  amount: number;
  currency: string;
  expiresAt: string | null;
  delivered: boolean;
  deliveryError: string | null;
}

export interface ShippingQuote {
  shipmentId: string;
  rates: {
    id: string;
    carrier: string;
    service: string;
    price: number;
    currency: string;
    days: number | null;
  }[];
}

// ─── Overview ────────────────────────────────────────────────────────────────

export interface ShopOverview {
  currency: string;
  range: { from: string; to: string };
  kpis: {
    revenue: { value: number; change: number | null };
    orders: { value: number; change: number | null };
    /** Percent of carts that were paid; `change` is in percentage points. */
    conversion: { value: number; change: number | null };
    recovered: { value: number };
  };
  series: { date: string; revenue: number; recovered: number; orders: number }[];
  channels: { channel: ShopChannel; revenue: number; orders: number }[];
  billableMessages: Partial<
    Record<"MARKETING" | "UTILITY" | "AUTHENTICATION" | "SERVICE" | "UNKNOWN", number>
  >;
  recentOrders: {
    id: string;
    number: number;
    customerName: string | null;
    channel: ShopChannel;
    total: number;
    currency: string;
    status: ShopOrderStatus;
    paymentStatus: ShopPaymentStatus;
    fulfillmentStatus: ShopFulfillmentStatus;
    nextStep: string;
    createdAt: string;
  }[];
  attention: {
    lowStock: { productId: string; title: string; stock: number; waiting: number }[];
    codUnconfirmed: number;
    openCartsToday: { count: number; value: number };
    returnsRequested: { id: string; reason: string; orderId: string; number: number }[];
    failedDeliveries: number;
    syncErrors: number;
  };
  setup: { steps: { id: string; label: string; done: boolean }[]; done: number; total: number };
}

// ─── Coupons ─────────────────────────────────────────────────────────────────

export interface ShopDiscount {
  id: string;
  code: string;
  title: string | null;
  type: ShopDiscountType;
  value: Money | null;
  buyQty: number | null;
  getQty: number | null;
  minSubtotal: Money | null;
  appliesTo: "ALL" | "COLLECTIONS" | "PRODUCTS";
  collectionIds: string[];
  productIds: string[];
  eligibility: "ANYONE" | "FIRST_ORDER" | "LOYALTY_MEMBERS";
  usageLimit: number | null;
  perCustomerLimit: number | null;
  usedCount: number;
  startsAt: string;
  endsAt: string | null;
  active: boolean;
  source: "MANUAL" | "LOYALTY" | "CART_REMINDER" | "COD_PREPAID";
  state: ShopDiscountState;
  revenue: number;
}

export interface ShopDiscountInput {
  code: string;
  title?: string | null;
  type: ShopDiscountType;
  value?: number | null;
  buyQty?: number | null;
  getQty?: number | null;
  minSubtotal?: number | null;
  appliesTo?: "ALL" | "COLLECTIONS" | "PRODUCTS";
  collectionIds?: string[];
  productIds?: string[];
  eligibility?: "ANYONE" | "FIRST_ORDER" | "LOYALTY_MEMBERS";
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  startsAt?: string;
  endsAt?: string | null;
  active?: boolean;
}

// ─── Authenticated calls ─────────────────────────────────────────────────────

const BASE = "/shop";
const get = async <T>(url: string, params?: object) =>
  (await axiosClient.get<T>(url, { params })).data;
const post = async <T>(url: string, body?: unknown) =>
  (await axiosClient.post<T>(url, body ?? {})).data;
const put = async <T>(url: string, body?: unknown) =>
  (await axiosClient.put<T>(url, body ?? {})).data;
const patch = async <T>(url: string, body?: unknown) =>
  (await axiosClient.patch<T>(url, body ?? {})).data;
const del = async <T>(url: string) => (await axiosClient.delete<T>(url)).data;

export const getShopStore = () => get<ShopStore>(`${BASE}/store`);
export const updateShopStore = (data: ShopStoreUpdate) => patch<ShopStore>(`${BASE}/store`, data);
export const createShippingRate = (data: ShopShippingRateInput) =>
  post<ShopShippingRate>(`${BASE}/shipping-rates`, data);
export const updateShippingRate = (id: string, data: ShopShippingRateInput) =>
  put<ShopShippingRate>(`${BASE}/shipping-rates/${id}`, data);
export const deleteShippingRate = (id: string) => del<{ ok: true }>(`${BASE}/shipping-rates/${id}`);
export const getShopSetup = () => get<ShopOverview["setup"]>(`${BASE}/setup`);
export const getShopOverview = (range: { from?: string; to?: string }) =>
  get<ShopOverview>(`${BASE}/overview`, range);

// ─── Messaging cost ──────────────────────────────────────────────────────────

export type MessageCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION" | "SERVICE";
export type MessageRates = Record<MessageCategory, number>;
export type MessageSourceKind =
  | "campaign"
  | "automation"
  | "template"
  | "inbox"
  | "ad"
  | "instagram";

/** Mirrors `getMessageReport` in rateup-api's shop/messageCost.service.ts. */
export interface ShopMessageCost {
  currency: string;
  range: { from: string; to: string };
  /** Null when the store's currency has no estimate and no rates were entered. */
  rates: MessageRates | null;
  ratesEstimated: boolean;
  attributionDays: number;
  totals: {
    billableMessages: number;
    cost: number | null;
    revenue: number;
    attributedRevenue: number;
    orders: number;
    roi: number | null;
  };
  byCategory: { category: MessageCategory; billable: number; free: number; cost: number | null }[];
  sources: {
    key: string;
    kind: MessageSourceKind;
    refId?: string;
    label?: string;
    messages: number;
    billableMessages: number;
    cost: number | null;
    orders: number;
    revenue: number;
    roi: number | null;
  }[];
}

export const getShopMessageCost = (range: { from?: string; to?: string }) =>
  get<ShopMessageCost>(`${BASE}/message-cost`, range);
/** Mirrors `getAdReport` in rateup-api's shop/adReport.service.ts. */
export interface ShopAdReport {
  currency: string;
  range: { from: string; to: string };
  ratesEstimated: boolean;
  attributionDays: number;
  ads: {
    adId: string;
    headline: string | null;
    sourceUrl: string | null;
    mediaUrl: string | null;
    clicks: number;
    people: number;
    billableMessages: number;
    cost: number | null;
    orders: number;
    revenue: number;
    roi: number | null;
  }[];
}

export const getShopAdReport = (range: { from?: string; to?: string }) =>
  get<ShopAdReport>(`${BASE}/ad-report`, range);
export const setShopMessageRates = (rates: MessageRates | null) =>
  put<{ rates: MessageRates | null; estimated: boolean }>(`${BASE}/message-cost/rates`, { rates });

export const getShopProducts = (query: ShopProductQuery) =>
  get<Paged<ShopProduct> & { counts: Partial<Record<ShopProductStatus, number>> }>(
    `${BASE}/products`,
    query,
  );
export const getShopProduct = (id: string) => get<ShopProduct>(`${BASE}/products/${id}`);
export const createShopProduct = (data: ShopProductInput) =>
  post<ShopProduct>(`${BASE}/products`, data);
export const updateShopProduct = (id: string, data: ShopProductInput) =>
  put<ShopProduct>(`${BASE}/products/${id}`, data);
export const archiveShopProduct = (id: string) => del<{ ok: true }>(`${BASE}/products/${id}`);
export const bulkSetProductStatus = (ids: string[], status: ShopProductStatus) =>
  post<{ ok: true }>(`${BASE}/products/bulk-status`, { ids, status });
export interface ShopBulkEdit {
  variantIds: string[];
  price?: { mode: "set" | "percent" | "amount"; value: number };
  compareAtPrice?: { mode: "set"; value: number } | { mode: "clear" };
  stock?: { mode: "set" | "adjust"; value: number };
  status?: "ACTIVE" | "DRAFT";
}
export const bulkEditShopProducts = (data: ShopBulkEdit) =>
  post<{ updated: number; skipped: { variant: string; reason: string }[] }>(
    `${BASE}/products/bulk-edit`,
    data,
  );
export const duplicateShopProduct = (productId: string) =>
  post<ShopProduct>(`${BASE}/products/${productId}/duplicate`);
export const setVariantStock = (variantId: string, stock: number, note?: string) =>
  put<ShopVariant>(`${BASE}/variants/${variantId}/stock`, { stock, note });
export const getStockHistory = (variantId: string) =>
  get<StockMovement[]>(`${BASE}/variants/${variantId}/stock-history`);
export const exportShopProductsCsv = () => get<string>(`${BASE}/products/export`);
export const importShopProductsCsv = (csv: string) =>
  post<{ created: number; skipped: { product: string; reason: string }[] }>(
    `${BASE}/products/import`,
    { csv },
  );

export const getShopCollections = () => get<ShopCollection[]>(`${BASE}/collections`);
export const createShopCollection = (data: {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
}) => post<ShopCollection>(`${BASE}/collections`, data);
export const updateShopCollection = (
  id: string,
  data: { name: string; description?: string | null; imageUrl?: string | null; position?: number },
) => put<ShopCollection>(`${BASE}/collections/${id}`, data);
export const deleteShopCollection = (id: string) => del<{ ok: true }>(`${BASE}/collections/${id}`);

export const getShopOrders = (query: ShopOrderQuery) =>
  get<Paged<ShopOrderRow> & { counts: Partial<Record<ShopOrderTab, number>> }>(
    `${BASE}/orders`,
    query,
  );
export const getShopOrder = (id: string) => get<ShopOrderDetail>(`${BASE}/orders/${id}`);
export const createShopOrder = (data: CreateShopOrderInput) =>
  post<{
    order: ShopOrderDetail;
    /** `url` is the checkout link, whether or not it reached the chat. */
    delivery: { sent: boolean; url: string };
  }>(`${BASE}/orders`, data);
export const sendShopPaymentLink = (id: string) =>
  post<PaymentLinkResult>(`${BASE}/orders/${id}/payment-link`);
export const setShopFulfillment = (
  id: string,
  status: ShopSettableFulfillmentStatus,
  note?: string,
) => post<ShopOrder>(`${BASE}/orders/${id}/fulfillment`, { status, note });
export const addShopShipment = (
  id: string,
  data: { carrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null },
) => post<ShopShipment>(`${BASE}/orders/${id}/shipments`, data);
export const quoteShopShipping = (
  id: string,
  parcel: { weightGrams: number; lengthCm?: number; widthCm?: number; heightCm?: number },
) => post<ShippingQuote>(`${BASE}/orders/${id}/shipping-quote`, parcel);
export const buyShopShippingLabel = (id: string, shipmentId: string, rateId: string) =>
  post<ShopShipment>(`${BASE}/orders/${id}/shipping-label`, { shipmentId, rateId });
export const cancelShopOrder = (
  id: string,
  data: { reason: string; restock?: boolean; notify?: boolean },
) => post<ShopOrder>(`${BASE}/orders/${id}/cancel`, data);
export const confirmShopCod = (id: string) => post<ShopOrder>(`${BASE}/orders/${id}/confirm-cod`);
export const markShopOrderPaid = (id: string, method: "cash" | "bank" | "manual" | "cod") =>
  post<ShopOrder>(`${BASE}/orders/${id}/mark-paid`, { method });
export const issueShopInvoice = (id: string) =>
  post<{ number: string; url: string }>(`${BASE}/orders/${id}/invoice`);
export const viewShopInvoice = (id: string) =>
  get<{ number: string; url: string }>(`${BASE}/orders/${id}/invoice`);
export const sendShopInvoice = (id: string) =>
  post<
    | { sent: true; number: string; channel: string }
    | { sent: false; number?: string; reason: string }
  >(`${BASE}/orders/${id}/invoice/send`);
export const refundShopOrder = (id: string, amount?: number | null) =>
  post<{ ok: true }>(`${BASE}/orders/${id}/refund`, { amount: amount ?? null });
export const updateShopOrderNote = (id: string, staffNote: string | null) =>
  put<{ ok: true }>(`${BASE}/orders/${id}/note`, { staffNote });
export const requestShopReturn = (
  id: string,
  data: {
    reason: string;
    items: { orderItemId: string; quantity: number }[];
    note?: string | null;
  },
) => post<ShopReturn>(`${BASE}/orders/${id}/returns`, data);
export const updateShopReturn = (
  returnId: string,
  data: {
    action: "approve" | "reject" | "receive";
    restock?: boolean;
    note?: string | null;
  },
) => post<ShopReturn>(`${BASE}/returns/${returnId}`, data);
export const refundShopReturn = (
  returnId: string,
  data: { refundAmount?: number | null; note?: string | null },
) => post<ShopReturn>(`${BASE}/returns/${returnId}/refund`, data);

export const sendShopProductsInChat = (data: {
  contactId: string;
  channel: "WHATSAPP" | "INSTAGRAM" | "MESSENGER";
  channelAccountId?: string | null;
  productIds: string[];
  text?: string;
}) => post<{ sent: number; skipped: number }>(`${BASE}/chat/products`, data);

export const getShopDiscounts = () => get<ShopDiscount[]>(`${BASE}/discounts`);
export const generateShopDiscountCode = (prefix = "") =>
  get<{ code: string }>(`${BASE}/discounts/generate-code`, { prefix });
export const createShopDiscount = (data: ShopDiscountInput) =>
  post<ShopDiscount>(`${BASE}/discounts`, data);
export const updateShopDiscount = (id: string, data: ShopDiscountInput) =>
  put<ShopDiscount>(`${BASE}/discounts/${id}`, data);
export const deleteShopDiscount = (id: string) =>
  del<{ archived: boolean }>(`${BASE}/discounts/${id}`);

export const getShopPayments = () => get<ShopPaymentMethods>(`${BASE}/payments`);
export const connectShopPaymentProvider = (
  provider: PaymentProviderId,
  data: { apiKey?: string; keyId?: string; keySecret?: string; webhookSecret?: string },
) => post<ShopPaymentMethods>(`${BASE}/payments/${provider}`, data);
export const setShopPaymentWebhookSecret = (provider: PaymentProviderId, webhookSecret: string) =>
  put<ShopPaymentMethods>(`${BASE}/payments/${provider}/webhook-secret`, { webhookSecret });
export const disconnectShopPaymentProvider = (provider: PaymentProviderId) =>
  del<ShopPaymentMethods>(`${BASE}/payments/${provider}`);

export interface ShippingProviders {
  easypost: { connected: boolean; fromAddress: (ShopAddress & { company?: string }) | null };
}
// ─── Guided setup ────────────────────────────────────────────────────────────

export interface ShopWhatsappStatus {
  connected: boolean;
  numbers: { id: string; phone: string | null; phoneId: string | null; wabaId: string | null }[];
}

export interface FoundCatalogs {
  whatsapp: ShopWhatsappStatus;
  catalogs: { catalogId: string; name: string | null; connectedToWhatsapp: boolean }[];
  /** The store's catalog after the search; picked automatically when there was one obvious choice. */
  selected: string | null;
  warnings: string[];
}

/** Pulls catalogs from Meta and, when there is one obvious choice, connects it and republishes. */
export const findShopCatalogs = () => post<FoundCatalogs>(`${BASE}/setup/find-catalogs`);
/** Publishes every product again, e.g. after fixing photos or connecting a catalog. */
export const republishShop = () => post<{ republished: number }>(`${BASE}/setup/republish`);

export type SendToMeResult =
  | {
      sent: true;
      asProductCard: boolean;
      /** The store's catalog isn't the one connected to WhatsApp, so no card could go out. */
      catalogNotConnected?: boolean;
    }
  | { sent: false; reason: "window_closed"; openChatUrl: string };
/** The product as a customer gets it, to the merchant's own WhatsApp (needs their 24-hour window). */
export const sendShopProductToMe = (productId: string, phone: string) =>
  post<SendToMeResult>(`${BASE}/products/${productId}/send-to-me`, { phone });

/** A real draft order marked as a test, with its checkout link. Counts toward setup. */
export const createShopTestOrder = (
  data: { productId?: string | null; phone?: string | null } = {},
) =>
  post<{ orderId: string; number: number; checkoutUrl: string; createsStoreOrder?: boolean }>(
    `${BASE}/test-order`,
    data,
  );

/** The storefront as shoppers will see it, even before it is switched on. */
export const getShopStorefrontPreview = () => get<Storefront>(`${BASE}/storefront-preview`);

export const getShopShippingProviders = () => get<ShippingProviders>(`${BASE}/shipping-providers`);
export const connectEasypost = (data: {
  apiKey: string;
  fromAddress: ShopAddress & { company?: string };
}) => post<ShippingProviders>(`${BASE}/shipping-providers/easypost`, data);
export const disconnectEasypost = () =>
  del<ShippingProviders>(`${BASE}/shipping-providers/easypost`);

// ─── Public: storefront and hosted checkout ──────────────────────────────────

export interface StorefrontVariant {
  id: string;
  title: string;
  sku: string | null;
  optionValues: Record<string, string> | null;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string | null;
  soldOut: boolean;
  lowStock: boolean;
}

export interface StorefrontProduct {
  id: string;
  title: string;
  description: string | null;
  images: string[];
  options: ShopProductOption[] | null;
  collectionIds: string[];
  variants: StorefrontVariant[];
}

export interface Storefront {
  store: {
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    currency: string;
    theme: ShopStorefrontTheme | null;
    /** Digits only, for wa.me links. */
    whatsappNumber: string | null;
    instagramUrl: string | null;
    /** False once the shop's plan has taken this month's orders. */
    acceptingOrders?: boolean;
    highlight: {
      code: string;
      type: ShopDiscountType;
      value: number | null;
      endsAt: string | null;
    } | null;
  };
  collections: { id: string; name: string; slug: string; imageUrl: string | null }[];
  products: StorefrontProduct[];
}

/** Live storefronts and their products, for /s/sitemap.xml. */
export interface SitemapStore {
  slug: string;
  updatedAt: string;
  products: { id: string; title: string; updatedAt: string }[];
}

export interface PublicOrder {
  id: string;
  number: number;
  status: ShopOrderStatus;
  paymentStatus: ShopPaymentStatus;
  fulfillmentStatus: ShopFulfillmentStatus;
  paymentMethod: string | null;
  currency: string;
  subtotal: number;
  discountTotal: number;
  discountCode: string | null;
  pointsDiscount: number;
  pointsRedeemed: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  shippingAddress: ShopAddress | null;
  shippingRate: ShopSelectedShipping | null;
  channel: ShopChannel;
  items: {
    id: string;
    title: string;
    variantTitle: string | null;
    imageUrl: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[];
  tracking: {
    carrier: string | null;
    trackingUrl: string | null;
    status: ShopFulfillmentStatus;
  } | null;
  placedAt: string | null;
  paidAt: string | null;
  /** A cash order the shopper still has to confirm on WhatsApp. */
  awaitingConfirmation?: boolean;
  /** A return the shopper asked for that the shop hasn't closed yet. */
  returnRequested?: boolean;
}

export interface PublicCheckout {
  store: {
    name: string;
    slug: string;
    logoUrl: string | null;
    currency: string;
    allowCoupons: boolean;
    askAddress: boolean;
    /** Payment needs a delivery option that serves the address. */
    chargesDelivery?: boolean;
    storefrontEnabled: boolean;
    pricesIncludeTax: boolean;
    /** Digits only, for wa.me links. */
    whatsappNumber?: string | null;
    /** False once the shop's plan has taken this month's orders. */
    acceptingOrders?: boolean;
  };
  order: PublicOrder;
  /** The draft passed its expiry, or was swept as abandoned. */
  checkoutExpired?: boolean;
  /** A real invoice PDF exists at `publicInvoiceUrl(token)`. */
  invoiceAvailable?: boolean;
  /** Set while a bank-transfer order waits for the money. */
  bankDetails: ShopBankDetails | null;
  shippingRates: {
    id: string;
    name: string;
    zone: string;
    minDays: number | null;
    maxDays: number | null;
    price: number;
  }[];
  points: {
    balance: number;
    tier: string | null;
    currencyName: string;
    points: number;
    value: number;
  } | null;
  paymentOptions: {
    online: { provider: PaymentProviderId; label: string } | null;
    cod: boolean;
    bank: boolean;
  };
  /**
   * Paid on the shop's own Shopify or WooCommerce checkout. `collectsDetails`: this page asks
   * for the address and delivery first, as WooCommerce's payment page doesn't.
   */
  storeCheckout: {
    provider: "shopify" | "woocommerce";
    label: string;
    url: string | null;
    collectsDetails: boolean;
  } | null;
}

export interface PublicCheckoutPatch {
  shippingAddress?: ShopAddress | null;
  shippingRateId?: string | null;
  /** null removes the applied code. */
  discountCode?: string | null;
  usePoints?: boolean;
  customer?: { name?: string | null; email?: string | null; phone?: string | null };
  note?: string | null;
}

/** A prefilled WhatsApp message whose code proves the shopper's number to the store. */
export interface WhatsappConfirmLink {
  code: string;
  waUrl: string;
  expiresAt: string;
}

export type PublicPayResult =
  | { status: "redirect"; url: string }
  | { status: "placed"; bank?: ShopBankDetails | null }
  | { status: "paid" }
  | ({ status: "verify" } & WhatsappConfirmLink);

const PUBLIC = "/public/shop";

export const getStorefrontSitemap = () =>
  get<{ stores: SitemapStore[] }>(`${PUBLIC}/storefronts/sitemap`);
export const getStorefront = async (slug: string, headers?: Record<string, string>) =>
  (
    await axiosClient.get<Storefront>(`${PUBLIC}/storefront/${encodeURIComponent(slug)}`, {
      headers,
    })
  ).data;
export const startStorefrontCheckout = (
  slug: string,
  items: { variantId: string; quantity: number }[],
  opts: { customer?: { phone?: string; name?: string }; reuseToken?: string } = {},
) =>
  post<{ token: string; url: string }>(
    `${PUBLIC}/storefront/${encodeURIComponent(slug)}/checkout`,
    {
      items,
      ...opts,
    },
  );
export const subscribeBackInStock = (slug: string, variantId: string) =>
  post<WhatsappConfirmLink>(`${PUBLIC}/storefront/${encodeURIComponent(slug)}/back-in-stock`, {
    variantId,
  });
export const getPublicCheckout = (token: string, opts: { justPaid?: boolean } = {}) =>
  get<PublicCheckout>(
    `${PUBLIC}/checkout/${encodeURIComponent(token)}`,
    opts.justPaid ? { paid: "1" } : undefined,
  );
export const updatePublicCheckout = (token: string, data: PublicCheckoutPatch) =>
  patch<PublicCheckout>(`${PUBLIC}/checkout/${encodeURIComponent(token)}`, data);
export const payPublicCheckout = (token: string, method: "online" | "cod" | "bank") =>
  post<PublicPayResult>(`${PUBLIC}/checkout/${encodeURIComponent(token)}/pay`, { method });
/** Creates the order in the shop's Shopify or WooCommerce store (once) and returns its page. */
export const startPublicStoreCheckout = (token: string) =>
  post<{ url: string }>(`${PUBLIC}/checkout/${encodeURIComponent(token)}/store`);
/** Redirects to the order's invoice PDF. */
export const publicInvoiceUrl = (token: string) =>
  `${import.meta.env.VITE_API_URL}/api${PUBLIC}/checkout/${encodeURIComponent(token)}/invoice`;
export const requestPublicReturn = (
  token: string,
  data: {
    reason: string;
    items: { orderItemId: string; quantity: number }[];
    note?: string | null;
  },
) => post<{ ok: true }>(`${PUBLIC}/checkout/${encodeURIComponent(token)}/returns`, data);

/**
 * "$24.00"-style display for any ISO currency, with the currency's own decimals. A fixed
 * locale, because the public pages render on the server too and must hydrate identically.
 */
export function formatMoney(value: Money | null | undefined, currency: string, locale = "en") {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(toMoney(value));
  } catch {
    return `${currency} ${toMoney(value).toLocaleString("en", { maximumFractionDigits: 2 })}`;
  }
}

/** Mirrors the connected Shopify/WooCommerce store's products into the shop. */
export type ShopImportSource = "meta" | "shopify" | "woocommerce";
export interface ShopImportSources {
  mode: ShopStore["mode"];
  ownProducts: number;
  meta: {
    catalogId: string | null;
    catalogName: string | null;
    /** Every catalog the business has, the connected one first. */
    catalogs: { catalogId: string; name: string | null }[];
  };
  shopify: { connected: boolean };
  woocommerce: { connected: boolean };
}
export interface ShopImportResult {
  source: ShopImportSource;
  created: number;
  updated: number;
  skipped: { product: string; reason: string }[];
}
export const getShopImportSources = () => get<ShopImportSources>(`${BASE}/products/import-sources`);
export const importShopProductsFrom = (data: {
  source: ShopImportSource;
  keepInSync?: boolean;
  catalogId?: string;
}) => post<ShopImportResult>(`${BASE}/products/import-from`, data);

export const syncShopFromConnectedStore = () =>
  post<{
    source: "shopify" | "woocommerce";
    created: number;
    updated: number;
    archived: number;
    total: number;
    skipped: { count: number; reason: string } | null;
  }>(`${BASE}/products/sync-store`);
/** The shop stops following its store: the products become its own, RateUp takes payment. */
export const stopShopStoreSync = () =>
  post<{ store: ShopStore; products: number }>(`${BASE}/store/stop-sync`);

export interface ShopSegmentCriteria {
  productIds?: string[];
  collectionIds?: string[];
  minOrders?: number;
  minSpent?: number;
  orderedWithinDays?: number;
  notOrderedForDays?: number;
  channel?: "WHATSAPP" | "INSTAGRAM" | "MESSENGER" | "STOREFRONT";
}
export const previewShopSegment = (criteria: ShopSegmentCriteria) =>
  post<{ count: number }>(`${BASE}/segments/preview`, criteria);
/** Saves the shoppers matching `criteria` as a contact group campaigns can target. */
export const saveShopSegment = (data: {
  name: string;
  teamId: string;
  criteria: ShopSegmentCriteria;
}) => post<{ groupId: string; name: string; count: number }>(`${BASE}/segments`, data);
