import z from "zod";

import { SHOP_MESSAGE_CATALOG, shopBodyProblem } from "./messageCatalog.js";
import { isCurrencyCode } from "./money.js";
import type { ShopNotificationEvent } from "./shop.types.js";

const money = z.coerce.number().min(0).max(10_000_000);
/** WhatsApp's limit on a template's text, in words a store owner reads. */
const TOO_LONG = "This message is too long for WhatsApp. Keep it under 1,024 characters.";
const optionalMoney = money.nullable().optional();
/** Links shoppers and staff click, and images the server may fetch: http(s) only, never javascript: or data:. */
export const webUrl = () =>
  z
    .string()
    .trim()
    .max(2048)
    .url()
    .refine((u) => /^https?:\/\//i.test(u), "Use a link starting with https://");

export const idParams = z.object({ id: z.string().uuid() });

export const storeUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    slug: z.string().trim().min(2).max(40),
    description: z.string().max(500).nullable(),
    logoUrl: webUrl().nullable(),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .refine(isCurrencyCode, "Use a three-letter currency code, such as USD or EUR"),
    taxRate: z.coerce.number().min(0).max(50).nullable(),
    pricesIncludeTax: z.boolean(),
    metaCatalogId: z.string().nullable(),
    storefrontEnabled: z.boolean(),
    storefrontTheme: z
      .object({
        accent: z.string().max(20).optional(),
        banner: z
          .object({
            eyebrow: z.string().max(40).optional(),
            title: z.string().max(80).optional(),
            subtitle: z.string().max(120).optional(),
            imageUrl: webUrl().optional(),
          })
          .nullable()
          .optional(),
        instagramUrl: webUrl().nullable().optional(),
      })
      .nullable(),
    askAddress: z.boolean(),
    askDelivery: z.boolean(),
    offerPoints: z.boolean(),
    allowCoupons: z.boolean(),
    pointValue: z.coerce.number().min(0).max(1000).nullable(),
    minPointsToRedeem: z.coerce.number().int().min(1).max(1_000_000),
    maxPointsPct: z.coerce.number().int().min(1).max(100),
    codEnabled: z.boolean(),
    codConfirm: z.boolean(),
    codConfirmHours: z.coerce.number().int().min(1).max(168),
    codPrepaidDiscountPct: z.coerce.number().min(0).max(50).nullable(),
    bankTransferEnabled: z.boolean(),
    bankTransferHours: z.coerce.number().int().min(1).max(720),
    bankDetails: z
      .object({
        accountName: z.string().max(80).optional(),
        accountNumber: z.string().max(40).optional(),
        bankName: z.string().max(80).optional(),
        routingCode: z.string().max(40).optional(),
        instructions: z.string().max(300).optional(),
      })
      .nullable(),
    defaultPaymentProvider: z.enum(["stripe", "razorpay"]).nullable(),
    checkoutVia: z.enum(["RATEUP", "SHOPIFY", "WOOCOMMERCE"]),
    paymentLinkTtlHours: z.coerce.number().int().min(1).max(168),
    cartReminderMinutes: z.array(z.coerce.number().int().min(15).max(10_080)).max(3),
    cartReminderDiscountId: z.string().uuid().nullable(),
    lowStockThreshold: z.coerce.number().int().min(0).max(10_000),
    invoiceAutoSend: z.boolean(),
    invoicePrefix: z
      .string()
      .trim()
      .max(12)
      .regex(/^[A-Za-z0-9/_-]*$/, "Letters, numbers, - / _ only"),
    taxId: z.string().trim().max(40).nullable(),
    businessAddress: z.string().trim().max(400).nullable(),
    notifications: z
      .record(
        z.string(),
        z.object({
          enabled: z.boolean().optional(),
          waTemplateId: z.string().nullable().optional(),
          body: z.string().trim().max(1024, TOO_LONG).nullable().optional(),
        }),
      )
      .superRefine((all, ctx) => {
        for (const [key, value] of Object.entries(all)) {
          if (!value.body || !(key in SHOP_MESSAGE_CATALOG)) continue;
          const problem = shopBodyProblem(key as ShopNotificationEvent, value.body);
          if (problem) ctx.addIssue({ code: "custom", path: [key, "body"], message: problem });
        }
      }),
  })
  .partial();
export type StoreUpdateInput = z.infer<typeof storeUpdateSchema>;

/** Settings › Messages: one automatic message's words; null goes back to the default. */
export const shopMessageParams = z.object({ key: z.string().trim().min(1).max(40) });
export const shopMessageSaveSchema = z.object({
  body: z.string().trim().max(1024, TOO_LONG).nullable(),
  enabled: z.boolean().optional(),
  /** Also make the message's own WhatsApp template from the words. */
  makeTemplate: z.boolean().optional(),
});

export const shippingRateSchema = z.object({
  zone: z.string().trim().min(1).max(40).default("Domestic"),
  countries: z.array(z.string().trim().length(2).toUpperCase()).default([]),
  name: z.string().trim().min(1).max(40),
  minDays: z.coerce.number().int().min(0).max(120).nullable().optional(),
  maxDays: z.coerce.number().int().min(0).max(120).nullable().optional(),
  price: money,
  freeOver: optionalMoney,
  active: z.boolean().default(true),
  position: z.coerce.number().int().default(0),
});

const variantSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().max(80).optional(),
  optionValues: z.record(z.string(), z.string()).nullable().optional(),
  sku: z.string().trim().max(64).nullable().optional(),
  price: money,
  compareAtPrice: optionalMoney,
  trackInventory: z.boolean().optional(),
  stock: z.coerce.number().int().min(0).max(10_000_000).optional(),
  lowStockAt: z.coerce.number().int().min(0).nullable().optional(),
  allowBackorder: z.boolean().optional(),
  imageUrl: webUrl().nullable().optional(),
  weightGrams: z.coerce.number().int().min(0).nullable().optional(),
});

export const productSchema = z.object({
  title: z.string().trim().min(1).max(150),
  description: z.string().max(5000).nullable().optional(),
  brand: z.string().max(100).nullable().optional(),
  category: z.string().max(250).nullable().optional(),
  productUrl: webUrl().nullable().optional(),
  images: z.array(webUrl()).max(10).optional(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional(),
  options: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(30),
        values: z.array(z.string().trim().min(1).max(40)).max(30),
      }),
    )
    .max(3)
    .nullable()
    .optional(),
  showOnWhatsapp: z.boolean().optional(),
  showOnInstagram: z.boolean().optional(),
  showOnFacebook: z.boolean().optional(),
  showOnStorefront: z.boolean().optional(),
  loyaltyMultiplier: z.coerce.number().min(0).max(10).optional(),
  collectionIds: z.array(z.string().uuid()).optional(),
  variants: z.array(variantSchema).min(1).max(100),
});

export const productListQuery = z.object({
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional(),
  search: z.string().max(100).optional(),
  collectionId: z.string().uuid().optional(),
  filter: z.enum(["low_stock", "sold_out", "sync_errors"]).optional(),
  channel: z.enum(["whatsapp", "instagram", "storefront"]).optional(),
  /** Comma-separated catalog ids, for showing a sent WhatsApp product message. */
  retailerIds: z
    .string()
    .max(2000)
    .transform((v) =>
      v
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 30),
    )
    .optional(),
  /** "1": only what can be sold now (a store-checkout shop's own products are left out). */
  sellable: z.enum(["1"]).optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const bulkStatusSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
});

export const bulkEditSchema = z.object({
  variantIds: z.array(z.string().uuid()).min(1).max(1000),
  price: z
    .object({
      mode: z.enum(["set", "percent", "amount"]),
      value: z.number().min(-10_000_000).max(10_000_000),
    })
    .refine((p) => p.mode !== "set" || p.value >= 0, "Prices cannot be negative")
    .refine((p) => p.mode !== "percent" || p.value >= -100, "Prices cannot drop by more than 100%")
    .optional(),
  compareAtPrice: z
    .discriminatedUnion("mode", [
      z.object({ mode: z.literal("set"), value: z.number().min(0).max(10_000_000) }),
      z.object({ mode: z.literal("clear") }),
    ])
    .optional(),
  stock: z
    .object({
      mode: z.enum(["set", "adjust"]),
      value: z.number().int().min(-10_000_000).max(10_000_000),
    })
    .refine((s) => s.mode !== "set" || s.value >= 0, "Stock must be 0 or more")
    .optional(),
  status: z.enum(["ACTIVE", "DRAFT"]).optional(),
});

export const stockSchema = z.object({
  stock: z.coerce.number().int().min(0).max(10_000_000),
  note: z.string().max(200).optional(),
});

export const collectionSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().max(300).nullable().optional(),
  imageUrl: webUrl().nullable().optional(),
  position: z.coerce.number().int().optional(),
});

export const csvImportSchema = z.object({ csv: z.string().min(1).max(5_000_000) });
export const importFromSchema = z.object({
  source: z.enum(["meta", "shopify", "woocommerce"]),
  keepInSync: z.boolean().optional(),
  catalogId: z.string().trim().min(1).max(64).optional(),
});

export const discountSchema = z.object({
  code: z.string().trim().min(3).max(32),
  title: z.string().max(80).nullable().optional(),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING", "BUY_X_GET_Y"]),
  value: z.coerce.number().min(0).nullable().optional(),
  buyQty: z.coerce.number().int().min(1).nullable().optional(),
  getQty: z.coerce.number().int().min(1).nullable().optional(),
  minSubtotal: optionalMoney,
  appliesTo: z.enum(["ALL", "COLLECTIONS", "PRODUCTS"]).optional(),
  collectionIds: z.array(z.string().uuid()).optional(),
  productIds: z.array(z.string().uuid()).optional(),
  eligibility: z.enum(["ANYONE", "FIRST_ORDER", "LOYALTY_MEMBERS"]).optional(),
  usageLimit: z.coerce.number().int().min(1).nullable().optional(),
  perCustomerLimit: z.coerce.number().int().min(1).nullable().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  active: z.boolean().optional(),
});

export const orderListQuery = z.object({
  tab: z
    .enum([
      "all",
      "needs_action",
      "awaiting_payment",
      "to_pack",
      "shipped",
      "delivered",
      "returns",
      "drafts",
      "cancelled",
    ])
    .default("all"),
  search: z.string().max(100).optional(),
  channel: z.enum(["WHATSAPP", "INSTAGRAM", "MESSENGER", "STOREFRONT", "MANUAL"]).optional(),
  paymentStatus: z.string().optional(),
  contactId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const cartLine = z
  .object({
    variantId: z.string().uuid().optional(),
    retailerId: z.string().max(100).optional(),
    quantity: z.coerce.number().int().min(1).max(999),
  })
  .refine((l) => l.variantId || l.retailerId, "Each line needs a product");

export const createOrderSchema = z.object({
  contactId: z.string().uuid(),
  channel: z.enum(["WHATSAPP", "INSTAGRAM", "MESSENGER", "MANUAL"]),
  channelAccountId: z.string().nullable().optional(),
  items: z.array(cartLine).min(1).max(50),
  discountCode: z.string().max(32).nullable().optional(),
  shippingRateId: z.string().uuid().nullable().optional(),
  send: z.enum(["payment_link", "checkout_link", "none"]).default("payment_link"),
});

export const fulfillmentSchema = z.object({
  status: z.enum([
    "UNFULFILLED",
    "PACKED",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "FAILED_DELIVERY",
  ]),
  note: z.string().max(200).optional(),
});

export const shipmentSchema = z.object({
  carrier: z.string().max(60).nullable().optional(),
  trackingNumber: z.string().max(80).nullable().optional(),
  trackingUrl: webUrl().nullable().optional(),
});

export const cancelSchema = z.object({
  reason: z.string().trim().min(1).max(200),
  restock: z.boolean().default(true),
  notify: z.boolean().default(true),
});

export const refundSchema = z.object({
  amount: z.coerce.number().positive().nullable().optional(),
});

export const markPaidSchema = z.object({
  method: z.enum(["cash", "bank", "manual", "cod"]).default("manual"),
});

export const staffNoteSchema = z.object({ staffNote: z.string().max(2000).nullable() });

export const paymentConnectSchema = z.object({
  apiKey: z.string().trim().min(10).optional(),
  keyId: z.string().trim().min(5).optional(),
  keySecret: z.string().trim().min(5).optional(),
  webhookSecret: z.string().trim().min(5).optional(),
  accountName: z.string().max(80).optional(),
});

export const providerParams = z.object({ provider: z.enum(["stripe", "razorpay"]) });

export const webhookSecretSchema = z.object({ webhookSecret: z.string().trim().min(5).max(200) });

const addressSchema = z.object({
  name: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  line1: z.string().max(200).optional(),
  line2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(2).optional(),
});

export const easypostConnectSchema = z.object({
  apiKey: z.string().trim().min(10),
  fromAddress: addressSchema.extend({ company: z.string().max(100).optional() }),
});

export const quoteSchema = z.object({
  weightGrams: z.coerce.number().positive().max(100_000),
  lengthCm: z.coerce.number().positive().optional(),
  widthCm: z.coerce.number().positive().optional(),
  heightCm: z.coerce.number().positive().optional(),
});

export const buyLabelSchema = z.object({ shipmentId: z.string(), rateId: z.string() });

export const returnSchema = z.object({
  reason: z.string().trim().min(1).max(300),
  items: z
    .array(z.object({ orderItemId: z.string().uuid(), quantity: z.coerce.number().int().min(1) }))
    .min(1),
  note: z.string().max(500).nullable().optional(),
});

export const returnActionSchema = z.object({
  action: z.enum(["approve", "reject", "receive"]),
  /** Only read by "receive": put the items back in stock. Defaults to true. */
  restock: z.boolean().optional(),
  note: z.string().max(500).nullable().optional(),
});

export const returnRefundSchema = z.object({
  refundAmount: z.coerce.number().positive().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export const sendProductsSchema = z.object({
  contactId: z.string().uuid(),
  channel: z.enum(["WHATSAPP", "INSTAGRAM", "MESSENGER"]),
  channelAccountId: z.string().nullable().optional(),
  productIds: z.array(z.string().uuid()).min(1).max(30),
  text: z.string().max(1000).optional(),
});

// ─── Public ──────────────────────────────────────────────────────────────────

export const slugParams = z.object({ slug: z.string().min(1).max(60) });
export const tokenParams = z.object({ token: z.string().min(10).max(80) });

export const publicCheckoutQuery = z.object({ paid: z.string().optional() });

export const publicCheckoutPatch = z.object({
  shippingAddress: addressSchema.nullable().optional(),
  shippingRateId: z.string().uuid().nullable().optional(),
  discountCode: z.string().max(32).nullable().optional(),
  usePoints: z.boolean().optional(),
  customer: z
    .object({
      name: z.string().max(100).nullable().optional(),
      email: z.string().email().nullable().optional(),
      phone: z.string().max(30).nullable().optional(),
    })
    .optional(),
  note: z.string().max(500).nullable().optional(),
});

export const publicPaySchema = z.object({ method: z.enum(["online", "cod", "bank"]) });

export const storefrontCheckoutSchema = z.object({
  items: z.array(cartLine).min(1).max(50),
  customer: z
    .object({ phone: z.string().max(30).optional(), name: z.string().max(100).optional() })
    .optional(),
  /** The bag's previous checkout, reused while it is still open for exactly these lines. */
  reuseToken: z.string().max(64).optional(),
});

export const backInStockSchema = z.object({ variantId: z.string().uuid() });

export const webhookParams = z.object({ provider: z.string(), storeId: z.string().uuid() });
export const storeIdParams = z.object({ storeId: z.string().uuid() });

export const segmentCriteriaSchema = z.object({
  productIds: z.array(z.string().uuid()).max(50).optional(),
  collectionIds: z.array(z.string().uuid()).max(50).optional(),
  minOrders: z.coerce.number().int().min(1).optional(),
  minSpent: z.coerce.number().min(0).optional(),
  orderedWithinDays: z.coerce.number().int().min(1).max(3650).optional(),
  notOrderedForDays: z.coerce.number().int().min(1).max(3650).optional(),
  channel: z.enum(["WHATSAPP", "INSTAGRAM", "MESSENGER", "STOREFRONT"]).optional(),
});

export const saveSegmentSchema = z.object({
  name: z.string().trim().min(1).max(80),
  teamId: z.string().uuid(),
  criteria: segmentCriteriaSchema,
});

export const sendToMeSchema = z.object({ phone: z.string().trim().min(7).max(30) });

export const testOrderSchema = z.object({
  productId: z.string().uuid().nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
});

const rate = z.number().min(0).max(10);
export const messageRatesSchema = z.object({
  rates: z
    .object({ MARKETING: rate, UTILITY: rate, AUTHENTICATION: rate, SERVICE: rate })
    .nullable(),
});
