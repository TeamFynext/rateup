/** Shapes stored in the Shop models' Json columns (declared in global.d.ts as PrismaJson). */

export interface ShopStorefrontTheme {
  accent?: string;
  banner?: { eyebrow?: string; title?: string; subtitle?: string; imageUrl?: string } | null;
  instagramUrl?: string | null;
}

export interface ShopBankDetails {
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  routingCode?: string;
  instructions?: string;
}

export interface ShopProductOption {
  name: string;
  values: string[];
}

export type ShopVariantOptionValues = Record<string, string>;

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
  [field: string]: string | undefined;
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
  mediaId?: string;
  campaignId?: string;
  /** Opens a free 72-hour messaging window when it is a click-to-WhatsApp ad. */
  freeWindowUntil?: string;
  [field: string]: unknown;
}

export interface ShopShipmentEvent {
  at: string;
  status: string;
  description?: string;
  location?: string;
}

export interface ShopReturnItem {
  orderItemId: string;
  quantity: number;
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

export type ShopNotificationSettings = Partial<
  Record<ShopNotificationEvent, { enabled?: boolean; waTemplateId?: string | null }>
>;
