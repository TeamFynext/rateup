import z from "zod";
import { ShopifyEvents } from "../../../types/enums.js";

const byIdParamsSchema = z.object({
  id: z.string(),
});
const byShopParamsSchema = z.object({
  shop: z.string(),
});

const registerWebhookbyTopicSchema = z.object({
  topic: z.enum(ShopifyEvents),
});

const DAY_MS = 24 * 60 * 60 * 1000;

/** A results period; defaults to the last 30 days and is capped at a year. */
const attributionQuerySchema = z
  .object({
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
  })
  .transform(({ from, to }) => {
    const end = to ? new Date(to) : new Date();
    const start = from ? new Date(from) : new Date(end.getTime() - 30 * DAY_MS);
    return { from: start, to: end };
  })
  .refine(({ from, to }) => from < to && to.getTime() - from.getTime() <= 366 * DAY_MS, {
    message: "The period must run forwards and be at most a year",
  });

/** Where the storefront WhatsApp button shows; `home` is Shopify's `index` page type. */
export const SHOPIFY_WIDGET_PAGES = ["all", "home", "product", "collection", "cart"] as const;

/**
 * The storefront WhatsApp button's settings, as the merchant edits them and as
 * stored in `Integration.credential.widget`. The limits match what
 * extensions/whatsapp-widget/assets/rateup-whatsapp.js accepts.
 */
const shopifyWidgetSchema = z
  .object({
    enabled: z.boolean(),
    /** The WhatsApp number shoppers are sent to. */
    channelId: z.uuid().nullable(),
    buttonLabel: z.string().trim().max(40),
    greeting: z.string().trim().max(300),
    /** `{url}` becomes the page the shopper is on. */
    prefill: z.string().trim().max(500),
    /** Used on product pages; `{product}` and `{url}` name the product. */
    productPrefill: z.string().trim().max(500),
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    position: z.enum(["left", "right"]),
    offsetY: z.number().int().min(0).max(400),
    showOn: z.array(z.enum(SHOPIFY_WIDGET_PAGES)).min(1),
    hideOnMobile: z.boolean(),
  })
  .refine((widget) => !widget.enabled || widget.channelId, {
    message: "Choose a WhatsApp number before switching the button on",
    path: ["channelId"],
  });

// Shopify's page types the button can report; anything else is counted as "other".
const WIDGET_EVENT_PAGE_TYPES = [
  "index",
  "product",
  "collection",
  "list-collections",
  "cart",
  "page",
  "blog",
  "article",
  "search",
];

/**
 * A tap reported by the storefront script. It arrives from `sendBeacon` as
 * `text/plain` (no CORS preflight), so the body may still be a JSON string.
 */
const shopifyWidgetEventSchema = z.preprocess(
  (body) => {
    if (typeof body !== "string") return body;
    try {
      return JSON.parse(body);
    } catch {
      return undefined;
    }
  },
  z.object({
    shop: z.string().regex(/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i),
    event: z.enum(["open", "click"]),
    pageType: z
      .string()
      .max(60)
      .catch("")
      .transform((pageType) => (WIDGET_EVENT_PAGE_TYPES.includes(pageType) ? pageType : "other")),
  }),
);

export type ShopifyWidgetSettings = z.infer<typeof shopifyWidgetSchema>;
export type ShopifyWidgetEvent = z.infer<typeof shopifyWidgetEventSchema>;
export type IdParamInput = z.infer<typeof byIdParamsSchema>;
export type AttributionQuery = z.infer<typeof attributionQuerySchema>;
export type ShopParamInput = z.infer<typeof byShopParamsSchema>;
export type registerWebhookbyTopicInput = z.infer<typeof registerWebhookbyTopicSchema>;

// Auto-exported after fastify-zod migration
export {
  attributionQuerySchema,
  byIdParamsSchema,
  byShopParamsSchema,
  registerWebhookbyTopicSchema,
  shopifyWidgetEventSchema,
  shopifyWidgetSchema,
};
