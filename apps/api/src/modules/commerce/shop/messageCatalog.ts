import { fillPlaceholders } from "../../loyalty/messaging/render.js";
import type { ShopNotificationEvent } from "./shop.types.js";

/**
 * Every message a shop sends a customer on its own, independent of the channel carrying it.
 * The same model as loyalty's `messaging/catalog.ts`.
 *
 * `params` is the positional contract behind `{{1}}`, `{{2}}` …: the store's own words and
 * its WhatsApp template both read them in this order. The order-update events start with
 * name, order number and total because that is what templates mapped before this catalog
 * existed were sent; keep those first three where they are.
 *
 * `defaultBody` goes out while the store has written nothing for the message. A segment in
 * `[[ … ]]` is dropped whole when a placeholder inside it is empty, so "Carrier: ." never
 * reaches a customer.
 *
 * The same words become the message's WhatsApp template (`templateBodyFor`), with what a
 * template can't do worked around: links that ride on a button in chat are written into
 * the text (`templateSuffix`), since a template's link button can't point at a different
 * site per order, and `[[ … ]]` segments are left out, since a template can't drop words.
 */

export type ShopParamKey =
  | "name"
  | "orderNumber"
  | "total"
  | "trackingUrl"
  | "carrier"
  | "cancelReason"
  | "bankDetails"
  | "bankInstructions"
  | "storeName"
  | "productName"
  | "itemCount"
  | "discountCode"
  | "orderLink"
  | "payLink"
  | "checkoutLink"
  | "items"
  | "deliveryAddress";

export interface ShopMessageDefinition {
  /** The Meta template name the message submits under; unique per WhatsApp account. */
  templateName: string;
  params: readonly ShopParamKey[];
  defaultBody: string;
  defaultOn: boolean;
  /**
   * The event whose toggle and template applied to this message before it had its own.
   * Read until the store saves a value for this one.
   */
  inheritsFrom?: ShopNotificationEvent;
  /**
   * Added to the template's text when the store's words don't already use its variable:
   * the link a chat message carries on a button.
   */
  templateSuffix?: string;
  /**
   * Quick-reply buttons the template carries, by title. A tap sends the payload of the
   * chat message's button with the same title, so the two must stay the same words.
   */
  quickReplies?: readonly string[];
}

export type ShopParamValues = Partial<Record<ShopParamKey, string | null | undefined>>;

const ORDER = ["name", "orderNumber", "total"] as const;
/** Every order update can also name what was bought and where it goes. Kept last, so the
 *  variables before them keep their numbers in templates already approved. */
const ORDER_DETAILS = ["items", "deliveryAddress"] as const;

export const SHOP_MESSAGE_CATALOG: Record<ShopNotificationEvent, ShopMessageDefinition> = {
  placed: {
    templateName: "shop_order_placed",
    params: [...ORDER, ...ORDER_DETAILS],
    defaultBody: "Order {{2}} is confirmed. Please keep {{3}} ready for the delivery.",
    defaultOn: true,
  },
  cod_confirm: {
    templateName: "shop_cod_confirm",
    params: [...ORDER, ...ORDER_DETAILS],
    defaultBody:
      "Hi {{1}}, please confirm your cash on delivery order {{2}} for {{3}}. We'll pack it as soon as you confirm.",
    defaultOn: true,
    quickReplies: ["Confirm order", "Cancel"],
    inheritsFrom: "placed",
  },
  bank_transfer: {
    templateName: "shop_bank_transfer",
    params: [...ORDER, "bankDetails", "bankInstructions", ...ORDER_DETAILS],
    defaultBody:
      "Order {{2}} is reserved. Please transfer {{3}} to:\n{{4}}\n\nUse {{2}} as the reference.[[\n{{5}}]]",
    defaultOn: true,
    inheritsFrom: "placed",
  },
  paid: {
    templateName: "shop_order_paid",
    params: [...ORDER, "orderLink", ...ORDER_DETAILS],
    defaultBody:
      "Payment received — thank you! Order {{2}} is confirmed and we'll let you know when it ships.",
    defaultOn: true,
    templateSuffix: "\n\nView your order at {{4}} any time.",
  },
  cod_confirmed: {
    templateName: "shop_cod_confirmed",
    params: [...ORDER, ...ORDER_DETAILS],
    defaultBody: "Thanks! Order {{2}} is confirmed. We'll message you when it ships.",
    defaultOn: true,
    inheritsFrom: "paid",
  },
  packed: {
    templateName: "shop_order_packed",
    params: [...ORDER, ...ORDER_DETAILS],
    defaultBody: "Order {{2}} is packed and will ship soon.",
    defaultOn: false,
  },
  shipped: {
    templateName: "shop_order_shipped",
    params: [...ORDER, "trackingUrl", "carrier", ...ORDER_DETAILS],
    defaultBody: "Your order {{2}} is on its way.[[ Carrier: {{5}}.]]",
    defaultOn: true,
    templateSuffix: "\n\nTrack your parcel at {{4}} any time.",
  },
  out_for_delivery: {
    templateName: "shop_order_out_for_delivery",
    params: [...ORDER, ...ORDER_DETAILS],
    defaultBody: "Order {{2}} is out for delivery today.",
    defaultOn: true,
  },
  delivered: {
    templateName: "shop_order_delivered",
    params: [...ORDER, ...ORDER_DETAILS],
    defaultBody: "Order {{2}} has been delivered. We hope you love it!",
    defaultOn: true,
  },
  delivery_failed: {
    templateName: "shop_order_delivery_failed",
    params: [...ORDER, ...ORDER_DETAILS],
    defaultBody:
      "We couldn't deliver order {{2}}. Reply here with a good time or address and we'll arrange it.",
    defaultOn: true,
  },
  cancelled: {
    templateName: "shop_order_cancelled",
    params: [...ORDER, "cancelReason", ...ORDER_DETAILS],
    defaultBody: "Order {{2}} has been cancelled.[[ Reason: {{4}}.]]",
    defaultOn: true,
  },
  refunded: {
    templateName: "shop_order_refunded",
    params: [...ORDER, ...ORDER_DETAILS],
    defaultBody: "We've refunded order {{2}}. It can take a few days to show on your statement.",
    defaultOn: true,
  },
  payment_reminder: {
    templateName: "shop_payment_reminder",
    params: [...ORDER, "payLink"],
    defaultBody: "Your order {{2}} ({{3}}) is waiting for payment. The link is still open.",
    defaultOn: true,
    templateSuffix: "\n\nPay at {{4}} while the link is open.",
  },
  cart_reminder: {
    templateName: "shop_cart_reminder",
    params: ["name", "storeName", "itemCount", "discountCode", "checkoutLink"],
    defaultBody:
      "You left {{3}} in your cart at {{2}}. They're still saved for you.[[ Use code {{4}} at checkout for a little extra off.]]",
    defaultOn: true,
    templateSuffix: "\n\nFinish checkout at {{5}} when you're ready.",
  },
  back_in_stock: {
    templateName: "shop_back_in_stock",
    params: ["productName", "storeName"],
    defaultBody: "Good news — {{1}} is back in stock at {{2}}. Grab it before it sells out!",
    defaultOn: true,
    quickReplies: ["Buy now"],
  },
  review_request: {
    templateName: "shop_review_request",
    params: ["name", "orderNumber", "productName"],
    defaultBody: "How was your {{3}}? Tap to tell us — it takes a second.",
    defaultOn: true,
    quickReplies: ["Loved it", "It was okay", "Not happy"],
  },
};

/** The message's values in `{{n}}` order; a missing value is an empty string. */
export function paramsFor(key: ShopNotificationEvent, values: ShopParamValues): string[] {
  return SHOP_MESSAGE_CATALOG[key].params.map((p) => values[p] ?? "");
}

const OPTIONAL_SEGMENT = /\[\[([\s\S]*?)\]\]/g;
const PLACEHOLDER = /\{\{(\d+)\}\}/g;

/** Fills `{{n}}`, dropping any `[[ … ]]` segment that has an empty placeholder inside. */
export function renderShopBody(body: string, params: readonly string[]): string {
  const kept = body.replace(OPTIONAL_SEGMENT, (_m, inner: string) => {
    const indexes = [...inner.matchAll(PLACEHOLDER)].map((m) => Number(m[1]));
    return indexes.some((i) => !params[i - 1]) ? "" : inner;
  });
  return fillPlaceholders(kept, params);
}

/**
 * Why a store's text can't be saved for this message, or null when it can. A placeholder
 * past the catalog's params would always render empty.
 */
export function shopBodyProblem(key: ShopNotificationEvent, body: string): string | null {
  if (!body.trim()) return "The message is empty";
  const max = SHOP_MESSAGE_CATALOG[key].params.length;
  const bad = [...body.matchAll(PLACEHOLDER)]
    .map((m) => Number(m[1]))
    .find((i) => i < 1 || i > max);
  return bad === undefined ? null : `{{${bad}}} isn't a variable here; use {{1}} to {{${max}}}`;
}

/**
 * A template parameter as Meta takes it: no newlines, tabs or long runs of spaces, and never
 * empty. Multi-line values such as bank details are joined onto one line.
 */
export function templateParamText(value: string): string {
  const flat = value
    .replace(/\s*\n+\s*/g, " · ")
    .replace(/\t/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
  return flat || "-";
}

/** What Meta's reviewers see for each variable: believable values approve faster. */
const EXAMPLES: Record<ShopParamKey, string> = {
  name: "Ana",
  orderNumber: "#1001",
  total: "$24.00",
  trackingUrl: "https://track.example.com/1001",
  carrier: "DHL",
  cancelReason: "Out of stock",
  bankDetails: "Account name: Our Store · Account number: 12345678",
  bankInstructions: "Send a screenshot once paid",
  storeName: "Our Store",
  productName: "Blue T-shirt",
  itemCount: "2 items",
  discountCode: "SAVE10",
  orderLink: "https://rateup.app/c/abc123",
  payLink: "https://pay.example.com/abc123",
  checkoutLink: "https://rateup.app/c/abc123",
  items: "2 × Puttu, 1 × Kadala curry",
  deliveryAddress: "12 MG Road, Kochi, Kerala 682016",
};

/** Meta's limit on a template body. */
const TEMPLATE_MAX_LENGTH = 1024;

export interface ShopTemplateBody {
  /** The template's text, `{{1}}` … `{{n}}` in order, as Meta requires. */
  text: string;
  /** For each template variable in turn, the catalog variable (1-based) it stands for. */
  params: number[];
  examples: string[];
}

/**
 * The store's words as a WhatsApp template. Meta wants variables numbered from `{{1}}` in
 * order of appearance, so a text that uses only `{{2}}` is renumbered and `params` keeps
 * what each new number means. Meta also rejects a body that starts or ends with a variable.
 */
export function templateBodyFor(
  key: ShopNotificationEvent,
  body: string,
): ShopTemplateBody | { problem: string } {
  const definition = SHOP_MESSAGE_CATALOG[key];
  let text = body.replace(OPTIONAL_SEGMENT, "").trim();
  const suffix = definition.templateSuffix;
  if (suffix) {
    const linkVars = [...suffix.matchAll(PLACEHOLDER)].map((m) => m[0]);
    if (!linkVars.some((v) => text.includes(v))) text += suffix;
  }
  const params: number[] = [];
  text = text.replace(PLACEHOLDER, (_m, index: string) => {
    const original = Number(index);
    let at = params.indexOf(original);
    if (at === -1) at = params.push(original) - 1;
    return `{{${at + 1}}}`;
  });
  if (text.length > TEMPLATE_MAX_LENGTH) {
    const extra = text.length - TEMPLATE_MAX_LENGTH;
    return {
      problem: `Too long for a WhatsApp template once the link line is added. Remove ${extra} character${extra === 1 ? "" : "s"}`,
    };
  }
  if (/^\{\{\d+\}\}/.test(text) || /\{\{\d+\}\}[.!?]?$/.test(text)) {
    return {
      problem:
        "A WhatsApp template can't start or end with a variable; add a word before or after it",
    };
  }
  return {
    text,
    params,
    examples: params.map((i) => EXAMPLES[definition.params[i - 1]]),
  };
}
