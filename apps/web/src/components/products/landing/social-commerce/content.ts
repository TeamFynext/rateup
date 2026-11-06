/* Copy for the Social Commerce landing page. Every claim maps to something
   `rateup-api/src/modules/commerce/shop` really does — check there before adding one. Meta bills
   its AI agent directly, and RateUp takes no cut of sales, so nothing here prices either. */

import type { ProductFaqItem } from "../shared/ProductFaq";

export const COMMERCE_DESCRIPTION =
  "RateUp Social Commerce lets customers buy where they already message you. Publish products to the Meta catalog that WhatsApp, Instagram and Facebook share, check carts out inside the WhatsApp chat or on a hosted checkout page, take payment through your own Stripe or Razorpay account, and run every order from one list with shipping, tracking, returns, coupons and loyalty points.";

/** Feeds the JSON-LD `featureList` and the Markdown twin. */
export const COMMERCE_FEATURES = [
  "Products and variants with stock, published to the Meta catalog shared by WhatsApp, Instagram and Facebook",
  "Shopify and WooCommerce products mirrored in, and paid orders written back to Shopify",
  "WhatsApp cart checkout in the chat: address form, delivery options, coupon, loyalty points and a payment link",
  "Hosted checkout page for Instagram, Messenger and a link-in-bio storefront",
  "Payments through your own Stripe or Razorpay account, with no commission on sales",
  "Cash on delivery with WhatsApp confirmation and a discount for paying online instead, and bank transfer",
  "One Orders list across WhatsApp, Instagram, Messenger and the storefront, with fulfilment, tracking messages, refunds and returns",
  "EasyPost shipping labels and tracking",
  "Coupons: percent, fixed, free shipping, buy X get Y, first order and loyalty members only",
  "Cart and payment reminders, back-in-stock alerts and a review request after delivery",
  "Send products, create orders and payment links from the inbox and the mobile app",
  "Instagram and Messenger “Buy now” product carousels",
  "Click-to-WhatsApp ad attribution on orders",
  "Meta AI agent tools: search products, start checkout, order status and back-in-stock alerts",
] as const;

export const COMMERCE_FAQS: readonly ProductFaqItem[] = [
  {
    question: "Who holds the money when a customer pays?",
    answer:
      "You do. Payments go through your own Stripe or Razorpay account, straight to you. RateUp never holds the funds and takes no commission on your sales — the only processing fees are your payment provider's.",
  },
  {
    question: "How do customers pay from the chat?",
    answer:
      "Customers choose their items, address and delivery inside the chat, then pay through a secure link from your Stripe or Razorpay account. You can also accept cash on delivery, confirmed on WhatsApp, or bank transfer.",
  },
  {
    question: "Which countries does it work in?",
    answer:
      "Anywhere you can use WhatsApp Business, Instagram or Messenger, and anywhere your Stripe or Razorpay account can take payments.",
  },
  {
    question: "We already sell on Shopify. Do we have to move our products?",
    answer:
      "No. Connect your Shopify or WooCommerce store and its products are mirrored into RateUp and published to your Meta catalog. When a customer pays for a chat order, the order is written back to Shopify, so your Shopify admin still sees every sale.",
  },
  {
    question: "How does cash on delivery work?",
    answer:
      "A cash-on-delivery order asks the customer to confirm it on WhatsApp before you ship, so you don't pack orders nobody meant to place. You can also offer a discount for paying online instead.",
  },
  {
    question: "What does it cost?",
    answer:
      "RateUp takes no percentage of your sales. Your payment provider charges its usual processing fees, and if you buy shipping labels through EasyPost, EasyPost bills you for them. See the pricing page for RateUp's own plans.",
  },
  {
    question: "Can my team sell from the inbox?",
    answer:
      "Yes. Agents can send product cards, build an order for a customer and send a payment link from the inbox on the web or from the RateUp mobile app, and every order they create lands in the same Orders list.",
  },
];

export const PROBLEMS = [
  {
    title: "“Price?” in the comments",
    body: "A good reel fills the comments with people asking what it costs. By the time someone replies with a link, many have already scrolled on.",
    icon: "comment",
  },
  {
    title: "Sent off to a website",
    body: "The customer was ready in the chat. A link to a site, a fresh cart and a guest checkout is where they quietly give up.",
    icon: "leave",
  },
  {
    title: "Orders scattered across chats",
    body: "One order in WhatsApp, two in Instagram DMs, a payment screenshot somewhere. Nobody knows what's paid, packed or still waiting.",
    icon: "scatter",
  },
] as const;

export const FLOW_STEPS = [
  {
    title: "A comment, ad or question",
    body: "Someone comments on a reel, taps a click-to-WhatsApp ad or just asks.",
  },
  {
    title: "Product cards in the chat",
    body: "An automation, an agent or the AI agent replies with products from your catalog.",
  },
  {
    title: "A cart, built in the chat",
    body: "The customer adds items on WhatsApp, or taps Buy now on Instagram or Messenger.",
  },
  {
    title: "Pay where they are",
    body: "Address, delivery, coupon and points — then a payment link to your own account.",
  },
  {
    title: "Updates until it arrives",
    body: "Confirmation, tracking and delivery messages, then a review request.",
  },
] as const;

export interface OrderRow {
  id: string;
  when: string;
  name: string;
  handle: string;
  channel: "WhatsApp" | "Instagram" | "Messenger" | "Storefront";
  total: string;
  payment: string;
  paymentTone: Tone;
  fulfilment: string;
  fulfilmentTone: Tone;
  next: string;
}

export type Tone = "ok" | "warn" | "info" | "mute";

/* Illustrative orders for the Orders mock. Fictional names and +1 555 numbers only. */
export const ORDER_ROWS: readonly OrderRow[] = [
  {
    id: "#1042",
    when: "Today, 10:24",
    name: "Maya Chen",
    handle: "+1 555 0142",
    channel: "WhatsApp",
    total: "$82.00",
    payment: "Paid · Stripe",
    paymentTone: "ok",
    fulfilment: "To pack",
    fulfilmentTone: "warn",
    next: "Pack and add tracking",
  },
  {
    id: "#1041",
    when: "Today, 09:58",
    name: "Omar Haddad",
    handle: "@omar.h",
    channel: "Instagram",
    total: "$142.50",
    payment: "Link sent",
    paymentTone: "info",
    fulfilment: "Unfulfilled",
    fulfilmentTone: "mute",
    next: "Payment reminder scheduled",
  },
  {
    id: "#1040",
    when: "Today, 08:12",
    name: "Lena Fischer",
    handle: "+1 555 0118",
    channel: "Storefront",
    total: "$54.00",
    payment: "Paid · Razorpay",
    paymentTone: "ok",
    fulfilment: "Shipped",
    fulfilmentTone: "info",
    next: "Tracking sent on WhatsApp",
  },
  {
    id: "#1039",
    when: "Yesterday",
    name: "Daniel Okafor",
    handle: "+1 555 0177",
    channel: "WhatsApp",
    total: "$210.00",
    payment: "Cash on delivery",
    paymentTone: "warn",
    fulfilment: "Not confirmed",
    fulfilmentTone: "warn",
    next: "Waiting for WhatsApp confirmation",
  },
  {
    id: "#1038",
    when: "Yesterday",
    name: "Tom Becker",
    handle: "Messenger",
    channel: "Messenger",
    total: "$38.00",
    payment: "Bank transfer",
    paymentTone: "ok",
    fulfilment: "Delivered",
    fulfilmentTone: "ok",
    next: "Review request sent",
  },
  {
    id: "#1037",
    when: "Oct 15",
    name: "Aiko Tanaka",
    handle: "+1 555 0160",
    channel: "WhatsApp",
    total: "$29.00",
    payment: "Refunded",
    paymentTone: "mute",
    fulfilment: "Returned",
    fulfilmentTone: "mute",
    next: "—",
  },
];

/* The API's order filters, in its order. Counts are illustrative. */
export const ORDER_TABS = [
  { name: "All", count: 312 },
  { name: "Needs action", count: 7 },
  { name: "Awaiting payment", count: 4 },
  { name: "To pack", count: 12 },
  { name: "Shipped", count: 26 },
  { name: "Delivered", count: 251 },
  { name: "Returns", count: 2 },
] as const;
