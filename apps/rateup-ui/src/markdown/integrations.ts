// Markdown variant of /integrations, /integrations/shopify, /integrations/woocommerce,
// /integrations/hubspot and /integrations/pipedrive, served to clients that ask for
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
- **WooCommerce** — connect with your store address, no plugin. WhatsApp messages on order status
  changes (processing, completed, on hold, cancelled, refunded, failed), loyalty points on completed
  orders, rewards as one-use checkout coupons, new customers as contacts, and products in the
  WhatsApp catalog kept up to date. See /integrations/woocommerce
- **Petpooja** — restaurant POS and billing; points earned and redeemed at the counter
- **Zoho CRM and Bigin** — contacts and leads kept in step with the RateUp inbox
- **HubSpot** — contacts synced both ways, Leads board leads as HubSpot deals with column-to-stage
  mapping both ways, and closed WhatsApp conversations and survey responses logged as notes on the
  contact. See /integrations/hubspot
- **Pipedrive** — persons synced both ways, Leads board leads as Pipedrive deals with
  column-to-stage mapping and won/lost status both ways, and closed WhatsApp conversations logged
  as notes on the person. See /integrations/pipedrive
- **GetLead** — pipeline leads pushed into GetLead CRM
- **Zapier, Make and Pabbly Connect** — start workflows from RateUp events and send WhatsApp
  messages from them, across thousands of apps
- **WhatsApp Payments** (India) — collect payment for orders inside the chat through the gateways
  linked to your WhatsApp Business account
- **Amelia** — free appointment times from your Amelia booking calendar offered inside a WhatsApp
  flow
- **Google Sheets** — every survey response added to its own spreadsheet as it arrives
- **REST API and webhooks** — for anything without a native connector (https://docs.rateup.app)

## What the sync is for

- WhatsApp Loyalty (/products/whatsapp-loyalty) — points from the orders your store already records
- WhatsApp Broadcast (/products/whatsapp-broadcast) — campaigns segmented by purchase history
- WhatsApp Feedback (/products/whatsapp-feedback) — surveys triggered by order status

## Docs

https://docs.rateup.app
`;
