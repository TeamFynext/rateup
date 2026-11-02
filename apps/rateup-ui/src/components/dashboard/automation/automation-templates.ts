import type { CreateRuleInput } from "@/components/dashboard/automation/components/schema.ts";
import { DEFAULT_RULE_VALUES } from "@/components/dashboard/automation/components/schema.ts";
import { asShopProductsValue } from "@/components/dashboard/automation/components/ShopProductsAction.tsx";
import { ShopifyEvents } from "@/types/enums.ts";

/** An integration the template's trigger depends on. */
export type TemplateRequirement = "shopify" | "woocommerce" | "instagram";

/** What a template is for; the gallery filters on it. */
export type TemplateCategory =
  | "replies"
  | "routing"
  | "pipeline"
  | "labels"
  | "store"
  | "instagram";

export const TEMPLATE_CATEGORIES: readonly { value: TemplateCategory; label: string }[] = [
  { value: "replies", label: "Auto-replies" },
  { value: "routing", label: "Routing" },
  { value: "pipeline", label: "Pipeline" },
  { value: "labels", label: "Labels" },
  { value: "store", label: "Store orders" },
  { value: "instagram", label: "Instagram" },
];

/**
 * A starting point for a new automation. Prefills only: ids (which team, which label, which
 * WhatsApp template) are left empty, because only the author knows which of their teams is
 * "Support".
 */
export interface AutomationTemplate {
  id: string;
  name: string;
  sentence: string;
  category: TemplateCategory;
  requires?: TemplateRequirement;
  /** Starts on every connected channel rather than only the one in `values`. */
  everyChannel?: boolean;
  values: Partial<CreateRuleInput>;
}

const keywords = (...words: string[]): CreateRuleInput["groups"] => [
  {
    operator: "OR",
    conditions: words.map((value) => ({ field: "MESSAGE_BODY", operator: "CONTAINS", value })),
  },
];

const EMPTY_TEMPLATE_ACTION: CreateRuleInput["actions"][number] = {
  type: "SEND_TEMPLATE",
  value: { templateId: "", variableMapping: [] },
};

export const AUTOMATION_TEMPLATES: readonly AutomationTemplate[] = [
  {
    id: "keyword-auto-reply",
    category: "replies",
    name: "Keyword auto-reply",
    sentence: "Someone messages “refund” → assign it to Support and send your refund policy.",
    everyChannel: true,
    values: {
      name: "Refund requests",
      platform: "WHATSAPP",
      triggerEvent: "MESSAGE_RECEIVED",
      groups: keywords("refund", "return my order"),
      actions: [
        { type: "ASSIGN_TEAM", value: "" },
        {
          type: "SEND_MESSAGE",
          value:
            "Sorry to hear that! Refunds are processed within 5 working days of pickup. Reply PICKUP and we'll arrange one today.",
        },
        { type: "ATTACH_LABEL", value: "" },
      ],
      options: { sendOncePerDay: true },
    },
  },
  {
    id: "welcome-new-contacts",
    category: "replies",
    name: "Welcome new contacts",
    sentence: "Someone messages you for the first time → greet them and label them “New lead”.",
    everyChannel: true,
    values: {
      name: "Welcome new contacts",
      platform: "WHATSAPP",
      triggerEvent: "CONTACT_CREATED",
      groups: [],
      actions: [
        {
          type: "SEND_MESSAGE",
          value: "Hi! Thanks for reaching out. Tell us what you're looking for and we'll help.",
        },
        { type: "ATTACH_LABEL", value: "" },
      ],
    },
  },
  {
    id: "route-by-keyword",
    category: "routing",
    name: "Route to the right team",
    sentence: "A message mentions “invoice” or “billing” → assign the chat to your accounts team.",
    everyChannel: true,
    values: {
      name: "Billing questions → Accounts",
      platform: "WHATSAPP",
      triggerEvent: "MESSAGE_RECEIVED",
      groups: keywords("invoice", "billing"),
      actions: [{ type: "ASSIGN_TEAM", value: "" }],
    },
  },
  {
    id: "comment-to-dm",
    category: "instagram",
    name: "Comment → DM",
    sentence: "Someone comments “price” → reply under the comment and DM them the details.",
    requires: "instagram",
    values: {
      name: "Price comments → DM",
      platform: "INSTAGRAM",
      triggerEvent: "INSTAGRAM_COMMENT",
      groups: keywords("price", "dm me"),
      actions: [
        {
          type: "SEND_MESSAGE",
          value: "Thanks for asking! Here are the prices and sizes:",
        },
      ],
      options: { instagramScope: "ALL", instagramPublicReplies: ["Sent you a DM 📩"] },
    },
  },
  {
    id: "comment-to-buy",
    category: "instagram",
    name: "Comment to buy",
    sentence: "Someone comments “buy” → DM them the product with a link to check out.",
    requires: "instagram",
    values: {
      name: "Comment to buy",
      platform: "INSTAGRAM",
      triggerEvent: "INSTAGRAM_COMMENT",
      groups: keywords("buy", "link", "price"),
      actions: [{ type: "SEND_SHOP_PRODUCTS", value: { productIds: [] } }],
      options: { instagramScope: "ALL", instagramPublicReplies: ["Sent you the link 📩"] },
    },
  },
  {
    id: "live-drop",
    category: "instagram",
    name: "Live drop",
    sentence: "Someone comments “mine” on your live → the first 20 get a checkout link.",
    requires: "instagram",
    values: {
      name: "Live drop",
      platform: "INSTAGRAM",
      triggerEvent: "INSTAGRAM_COMMENT",
      groups: keywords("mine", "buy"),
      actions: [{ type: "SEND_SHOP_PRODUCTS", value: { productIds: [], dropLimit: 20 } }],
      options: { instagramCommentSource: "LIVE", instagramPublicReplies: ["Check your DMs 📩"] },
    },
  },
  {
    id: "ad-to-products",
    category: "store",
    name: "Ad to products",
    sentence: "Someone taps your click-to-WhatsApp ad → show them the products it promoted.",
    values: {
      name: "Ad to products",
      platform: "WHATSAPP",
      triggerEvent: "WHATSAPP_AD_REFERRAL",
      groups: [],
      actions: [{ type: "SEND_SHOP_PRODUCTS", value: { productIds: [] } }],
    },
  },
  {
    id: "order-confirmation",
    category: "store",
    name: "Order confirmation",
    sentence: "A Shopify order is placed → send the confirmation template with the order number.",
    requires: "shopify",
    values: {
      name: "Order placed → confirmation",
      platform: "WHATSAPP",
      triggerEvent: "SHOPIFY_EVENT",
      groups: [],
      actions: [EMPTY_TEMPLATE_ACTION],
      options: { shopifyEvent: ShopifyEvents.ORDERS_CREATE },
    },
  },
  {
    id: "abandoned-checkout",
    category: "store",
    name: "Abandoned cart reminder",
    sentence: "A Shopify checkout is left for an hour → remind the buyer what's in their cart.",
    requires: "shopify",
    values: {
      name: "Abandoned cart → reminder",
      platform: "WHATSAPP",
      triggerEvent: "SHOPIFY_EVENT",
      groups: [],
      actions: [EMPTY_TEMPLATE_ACTION],
      options: {
        shopifyEvent: ShopifyEvents.ABANDONED_CHECKOUTS,
        abandonedCheckoutDelayMinutes: 60,
        requireMarketingConsent: true,
      },
    },
  },
  {
    id: "shipping-update",
    category: "store",
    name: "Shipping update",
    sentence: "A Shopify order is fulfilled → send the tracking link on WhatsApp.",
    requires: "shopify",
    values: {
      name: "Order fulfilled → tracking link",
      platform: "WHATSAPP",
      triggerEvent: "SHOPIFY_EVENT",
      groups: [],
      actions: [EMPTY_TEMPLATE_ACTION],
      options: { shopifyEvent: ShopifyEvents.ORDERS_FULFILLED },
    },
  },
  {
    id: "woo-order-update",
    category: "store",
    name: "WooCommerce order update",
    sentence: "A WooCommerce order is paid → send the confirmation template.",
    requires: "woocommerce",
    values: {
      name: "Woo order paid → confirmation",
      platform: "WHATSAPP",
      triggerEvent: "WOOCOMMERCE_EVENT",
      groups: [],
      actions: [EMPTY_TEMPLATE_ACTION],
      options: { wooEvent: "processing" },
    },
  },
  {
    id: "chat-closed-feedback",
    category: "replies",
    name: "Feedback after a chat",
    sentence: "A chat is closed → send a short survey while it's still fresh.",
    everyChannel: true,
    values: {
      name: "Chat closed → feedback",
      platform: "WHATSAPP",
      triggerEvent: "CHAT_CLOSED",
      groups: [],
      actions: [{ type: "SEND_WEB_SURVEY", value: "" }],
    },
  },
  {
    id: "new-contact-to-pipeline",
    name: "Add new leads to your pipeline",
    sentence:
      "Someone messages you for the first time → add them to the first stage of your pipeline.",
    category: "pipeline",
    everyChannel: true,
    values: {
      name: "New contacts → pipeline",
      triggerEvent: "CONTACT_CREATED",
      groups: [],
      actions: [{ type: "ASSIGN_STAGE", value: "" }],
    },
  },
  {
    id: "pricing-to-pipeline",
    name: "Pricing questions → hot lead",
    sentence:
      "Someone asks about “price” or a “quote” → move them to a pipeline stage and label them “Hot lead”.",
    category: "pipeline",
    everyChannel: true,
    values: {
      name: "Pricing questions → hot lead",
      triggerEvent: "MESSAGE_RECEIVED",
      groups: keywords("price", "quote"),
      actions: [
        { type: "ASSIGN_STAGE", value: "" },
        { type: "ATTACH_LABEL", value: "" },
      ],
    },
  },
  {
    id: "won-deal-thank-you",
    name: "Thank customers when a deal is won",
    sentence: "A lead moves to your won stage → thank them and label them “Customer”.",
    category: "pipeline",
    everyChannel: true,
    values: {
      name: "Deal won → thank you",
      triggerEvent: "STAGE_UPDATED",
      groups: [
        {
          operator: "AND",
          conditions: [{ field: "CONTACT_STAGE", operator: "EQUALS", value: "" }],
        },
      ],
      actions: [
        {
          type: "SEND_MESSAGE",
          value: "Thank you for choosing us! Reply here any time you need help with your order.",
        },
        { type: "ATTACH_LABEL", value: "" },
      ],
    },
  },
  {
    id: "label-by-topic",
    name: "Label chats by topic",
    sentence:
      "A message mentions “delivery”, “shipping” or “tracking” → label the chat “Delivery”.",
    category: "labels",
    everyChannel: true,
    values: {
      name: "Delivery questions → label",
      triggerEvent: "MESSAGE_RECEIVED",
      groups: keywords("delivery", "shipping", "tracking"),
      actions: [{ type: "ATTACH_LABEL", value: "" }],
    },
  },
  {
    id: "label-wholesale",
    name: "Spot wholesale enquiries",
    sentence:
      "Someone mentions “wholesale” or “bulk order” → label them and assign the chat to your sales lead.",
    category: "labels",
    everyChannel: true,
    values: {
      name: "Wholesale enquiries",
      triggerEvent: "MESSAGE_RECEIVED",
      groups: keywords("wholesale", "bulk order"),
      actions: [
        { type: "ATTACH_LABEL", value: "" },
        { type: "ASSIGN_USER", value: "" },
      ],
    },
  },
  {
    id: "label-closed-chats",
    name: "Label chats when they close",
    sentence: "A chat is closed → label the contact “Served” so you can follow up later.",
    category: "labels",
    everyChannel: true,
    values: {
      name: "Chat closed → label",
      triggerEvent: "CHAT_CLOSED",
      groups: [],
      actions: [{ type: "ATTACH_LABEL", value: "" }],
    },
  },
  {
    id: "talk-to-a-person",
    name: "Hand over to a person",
    sentence:
      "Someone asks for an “agent” or a “human” → tell them help is coming and assign the chat to your team.",
    category: "routing",
    everyChannel: true,
    values: {
      name: "Asked for a person → team",
      triggerEvent: "MESSAGE_RECEIVED",
      groups: keywords("agent", "human", "talk to someone"),
      actions: [
        {
          type: "SEND_MESSAGE",
          value: "Sure! A member of our team will reply here shortly.",
        },
        { type: "ASSIGN_TEAM", value: "" },
      ],
    },
  },
  {
    id: "keyword-starts-chatbot",
    name: "Start a journey with a keyword",
    sentence: "Someone sends “menu” → start your journey so they can pick what they need.",
    category: "replies",
    values: {
      name: "“menu” → journey",
      platform: "WHATSAPP",
      triggerEvent: "MESSAGE_RECEIVED",
      groups: [
        {
          operator: "OR",
          conditions: [{ field: "MESSAGE_BODY", operator: "EQUALS", value: "menu" }],
        },
      ],
      actions: [{ type: "TRIGGER_CHATBOT", value: "" }],
    },
  },
  {
    id: "new-contact-webhook",
    name: "Send new contacts to your CRM",
    sentence: "A new contact is created → send their details to your webhook.",
    category: "routing",
    everyChannel: true,
    values: {
      name: "New contacts → webhook",
      triggerEvent: "CONTACT_CREATED",
      groups: [],
      actions: [{ type: "CALL_EXTERNAL_API", value: "" }],
    },
  },
  {
    id: "cancelled-order",
    name: "Cancelled order follow-up",
    sentence: "A Shopify order is cancelled → let the buyer know and ask if they need help.",
    category: "store",
    requires: "shopify",
    values: {
      name: "Order cancelled → follow-up",
      platform: "WHATSAPP",
      triggerEvent: "SHOPIFY_EVENT",
      groups: [],
      actions: [EMPTY_TEMPLATE_ACTION],
      options: { shopifyEvent: ShopifyEvents.ORDERS_CANCELLED },
    },
  },
];
export const findAutomationTemplate = (id: string | undefined) =>
  AUTOMATION_TEMPLATES.find((template) => template.id === id);

/**
 * A template merged over the new-rule defaults. `options` is merged a level deeper: a template
 * names only the options it cares about, and a plain spread would drop the rest of the object
 * the option fields are bound to.
 */
export function templateFormValues(
  template: AutomationTemplate | undefined,
  base: CreateRuleInput = DEFAULT_RULE_VALUES,
  /** The org's connected channels, for a template that starts on all of them. */
  connected: readonly string[] = [],
): CreateRuleInput {
  if (!template) return base;
  const platform = template.values.platform ?? base.platform;
  const platforms =
    template.everyChannel && connected.length ? [...connected] : [platform ?? "WHATSAPP"];
  return {
    ...base,
    ...template.values,
    platform: platforms[0],
    platforms,
    options: { ...base.options, ...template.values.options },
  };
}

/** A template opened from a product's page starts with that product in its product actions. */
export function withProduct(
  values: CreateRuleInput,
  productId: string | undefined,
): CreateRuleInput {
  if (!productId) return values;
  return {
    ...values,
    actions: values.actions.map((action) =>
      action.type === "SEND_SHOP_PRODUCTS"
        ? {
            id: action.id,
            type: "SEND_SHOP_PRODUCTS" as const,
            value: { ...asShopProductsValue(action.value), productIds: [productId] },
          }
        : action,
    ),
  };
}
