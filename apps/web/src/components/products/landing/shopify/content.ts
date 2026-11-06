/**
 * Copy and data for `/integrations/shopify`.
 *
 * The FAQ array is the reason this sits apart from the markup: the route builds the page's
 * `FAQPage` JSON-LD from the same six questions the accordion renders, so the structured data can
 * never describe an answer the page does not show.
 */

export interface ShopifyFaq {
  question: string;
  answer: string;
}

export const SHOPIFY_FAQS: readonly ShopifyFaq[] = [
  {
    question: "How do I connect Shopify to WhatsApp?",
    answer:
      "Install RateUp from the Shopify App Store and approve the permissions. RateUp registers your store webhooks automatically, then you choose a template per event, map its variables to Shopify fields and set a delay. Messages go out from your verified WhatsApp number.",
  },
  {
    question: "Which Shopify events can trigger a WhatsApp message?",
    answer:
      "Orders create, orders paid, orders fulfilled, orders partially fulfilled, orders cancelled, fulfilled orders cancelled and draft orders created — plus abandoned checkouts, which are reminded about after a delay you choose. Each event can be switched on or off from Settings.",
  },
  {
    question: "Can I send abandoned cart messages on WhatsApp from Shopify?",
    answer:
      "Yes. When a checkout sits untouched for the delay you set, RateUp sends your approved recovery template with the Checkout Recovery Link variable, so the customer returns to the same checkout. It stops if they complete the order first, and a second rule can send a follow-up. You can add a Copy offer code button to the template.",
  },
  {
    question: "Do loyalty points sync with Shopify orders?",
    answer:
      "With Enable Shopify order points switched on, points are awarded when an order is paid, revoked if it is cancelled, and adjusted when the order is edited. Customers check their balance by messaging a command like /points.",
  },
  {
    question: "Does RateUp use the official WhatsApp Business API?",
    answer:
      "Yes — every message is sent through the official WhatsApp Business API using approved message templates, from your own verified business number.",
  },
  {
    question: "Is there a free plan for Shopify stores?",
    answer:
      "Yes. RateUp has a free plan on the Shopify App Store, with Essential, Plus and Pro available as you scale.",
  },
];

/** The events RateUp ships today, as the design's table lists them. */
export const EVENT_ROWS: readonly (readonly [string, string, string])[] = [
  ["Orders create", "Send an approved template — optionally only for specific products", "1 hour"],
  ["Orders paid", "Send an approved template; award loyalty points", "1 hour"],
  ["Orders fulfilled", "Send an approved template; send a feedback Flow", "1 day"],
  ["Orders partially fulfilled", "Send an approved template", "2 hours"],
  ["Orders cancelled", "Send an approved template; revoke loyalty points", "1 hour"],
  ["Fulfilled orders cancelled", "Send an approved template; revoke loyalty points", "2 hours"],
  ["Draft orders created", "Send an approved template", "5 hours"],
  ["Abandoned checkouts", "Send the checkout recovery link after a delay you choose", "5 hours"],
];

export const SHOPIFY_STATS = [
  {
    value: "8 store events",
    label: "Order and checkout webhooks, including abandoned-cart reminders.",
  },
  {
    value: "20 Shopify fields",
    label: "Mappable into your approved template variables.",
  },
  {
    value: "10 starter templates",
    label: "order_payment_confirmed, order_shipped, abandoned_checkout, order_cancelled and more.",
  },
] as const;

export const SETUP_STEPS = [
  {
    n: "1",
    title: "Install from the App Store",
    body: "Install RateUp from the Shopify App Store and approve the permissions your store needs.",
  },
  {
    n: "2",
    title: "Webhooks register themselves",
    body: "RateUp registers your store webhooks automatically. Switch each event on or off from Settings.",
  },
  {
    n: "3",
    title: "Map templates and delays",
    body: "Choose a template per event, map its variables to Shopify fields, and set the delay.",
  },
] as const;

export const JOURNEY_TABS = ["orders", "cart", "loyalty", "feedback"] as const;

export type JourneyTab = (typeof JOURNEY_TABS)[number];

export const JOURNEY_LABEL: Record<JourneyTab, string> = {
  orders: "Order updates",
  cart: "Abandoned checkout",
  loyalty: "Loyalty points",
  feedback: "Feedback & reviews",
};

export const CASE_STUDIES = [
  {
    brand: "myG",
    figure: "3× repeat purchases",
    body: "A single WhatsApp loyalty programme running across 200+ stores, with points and balances handled in the thread.",
  },
  {
    brand: "Bhima Jewellery",
    figure: "3.1× campaign ROI",
    body: "98% open rate on campaign sends — the reason post-purchase messaging belongs on WhatsApp rather than email.",
  },
] as const;

export const SHOPIFY_APP_STORE_URL = "https://apps.shopify.com/rateup";
