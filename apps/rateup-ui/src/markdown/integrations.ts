// Hidden until WooCommerce and HubSpot launch — uncomment to show. On launch, add "/integrations/woocommerce" to the list below and replace the
// WooCommerce bullet with:
// - **WooCommerce** — connect with your store address, no plugin. WhatsApp messages on order status
//   changes (processing, completed, on hold, cancelled, refunded, failed), loyalty points on completed
//   orders, rewards as one-use checkout coupons, new customers as contacts, and products in the
//   WhatsApp catalog kept up to date. See /integrations/woocommerce
//
// Markdown variant of /integrations and /integrations/shopify, served to clients that ask for
// `Accept: text/markdown` via `createMarkdownMiddleware`.

export const integrationsMarkdown = `# RateUp Integrations

RateUp connects to the store, POS and CRM you already run. Orders, customers and loyalty points
sync both ways, so campaigns are segmented by what people actually bought and points post without
anyone typing them in.

## Native connectors

- **Shopify** — one-click install from the Shopify App Store (https://apps.shopify.com/rateup).
  Two-way order and customer sync, loyalty points on paid orders, abandoned-cart recovery,
  cash-on-delivery order confirmation, delivery-triggered post-purchase feedback, and Shopify order
  history alongside each conversation in the shared inbox. See /integrations/shopify
- **WooCommerce** — order and customer sync, post-purchase feedback, loyalty points on paid orders
- **Petpooja** — restaurant POS and billing; points earned and redeemed at the counter
- **Zoho** — CRM contact, deal and conversation sync
- **Zapier** — triggers and actions across 3,000+ apps
- **REST API and webhooks** — for anything without a native connector (https://docs.rateup.app)

## What the sync is for

- WhatsApp Loyalty (/products/whatsapp-loyalty) — points from the orders your store already records
- WhatsApp Broadcast (/products/whatsapp-broadcast) — campaigns segmented by purchase history
- WhatsApp Feedback (/products/whatsapp-feedback) — surveys triggered by order status

## Docs

https://docs.rateup.app
`;
