/**
 * Copy and data for `/integrations/woocommerce`.
 *
 * As on the Shopify page, the FAQ lives apart from the markup because the route builds the
 * `FAQPage` JSON-LD from the same array the accordion renders. Every claim here is something the
 * integration does today: no abandoned-cart recovery (WooCommerce core has no API for it), and
 * points land when an order is completed, not when it is paid.
 */

export interface WooFaq {
  question: string;
  answer: string;
}

export const WOO_FAQS: readonly WooFaq[] = [
  {
    question: "How do I connect WooCommerce to WhatsApp?",
    answer:
      "In RateUp, open Settings › Integrations › WooCommerce and enter your store's address. WooCommerce asks you to approve RateUp in your WordPress admin; once you do, RateUp registers the store webhooks it needs. No plugin to install. Your store must be served over HTTPS.",
  },
  {
    question: "Which WooCommerce order statuses can trigger a WhatsApp message?",
    answer:
      "Processing, completed, on hold, cancelled, refunded and failed. In Automation, pick the WooCommerce Event trigger and the status, optionally narrow it to orders containing specific products, and choose an approved template. A message is sent once per status change, even when WooCommerce sends the same update twice.",
  },
  {
    question: "Can the message include the order details?",
    answer:
      "Yes. Template variables can be filled from the order: order number, customer name, total and currency, the items ordered, payment and shipping method, billing and shipping city, and the customer's note. The first product's image can be used as the template's header.",
  },
  {
    question: "Do WooCommerce orders earn loyalty points?",
    answer:
      "With WooCommerce orders earn points switched on in Loyalty › Settings, points are awarded when an order is marked Completed and taken back if it is refunded or cancelled. A customer is matched to their loyalty account by phone number, or by email.",
  },
  {
    question: "Can loyalty rewards be used at the WooCommerce checkout?",
    answer:
      "Yes. Switch on Use at WooCommerce checkout on a fixed or percentage-off reward and each customer's reward code becomes a one-use WooCommerce coupon, expiring with the reward. When the code is used at checkout, the reward is marked used in RateUp.",
  },
  {
    question: "Does RateUp recover abandoned WooCommerce carts?",
    answer:
      "Not yet. WooCommerce has no built-in way to share abandoned carts with other apps, so recovery needs a plugin on your store, which is on our roadmap. Order messages, loyalty, contacts and the WhatsApp catalog work today.",
  },
];

/** The store events RateUp acts on. */
export const WOO_EVENT_ROWS: readonly (readonly [string, string])[] = [
  ["Order processing", "Send an approved template — optionally only for specific products"],
  ["Order completed", "Send an approved template; award loyalty points"],
  ["Order on hold", "Send an approved template — for example, to confirm a bank transfer"],
  ["Order cancelled", "Send an approved template; take back loyalty points"],
  ["Order refunded", "Send an approved template; take back loyalty points"],
  ["Order failed", "Send an approved template — for example, a retry-payment nudge"],
  ["New customer", "Add them as a RateUp contact (switch on in the integration's settings)"],
  ["Product updated", "Update the product's price, stock and details in your WhatsApp catalog"],
];

export const WOO_SETUP_STEPS = [
  {
    n: "1",
    title: "Enter your store's address",
    body: "In Settings › Integrations › WooCommerce, type your shop's address. RateUp checks WooCommerce is running there.",
  },
  {
    n: "2",
    title: "Approve RateUp in WordPress",
    body: "WooCommerce shows its own approval screen. Once you approve, RateUp registers the webhooks it needs — nothing to install.",
  },
  {
    n: "3",
    title: "Choose what happens",
    body: "Build order messages in Automation, switch on loyalty points and checkout coupons, and import products into your WhatsApp catalog.",
  },
] as const;

export const WOO_FEATURES = [
  {
    title: "Loyalty points on completed orders",
    body: "Points post when an order is completed and come back off on a refund or cancellation — no one types them in.",
  },
  {
    title: "Rewards as checkout coupons",
    body: "Each redeemed reward becomes a one-use WooCommerce coupon, so the code sent on WhatsApp works at your checkout.",
  },
  {
    title: "Customers become contacts",
    body: "New customers with a phone number join your RateUp contacts, linked to the number if it is already there.",
  },
  {
    title: "Your catalog on WhatsApp",
    body: "Import products into your WhatsApp catalog. Price, stock and details follow what you change in WooCommerce.",
  },
] as const;
