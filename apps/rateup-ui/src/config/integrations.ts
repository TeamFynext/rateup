import type { ComponentType } from "react";

import {
  AmeliaLogo,
  GetLeadLogo,
  GoogleSheetsLogo,
  HubSpotLogo,
  MakeLogo,
  PabblyLogo,
  PetpoojaLogo,
  PipedriveLogo,
  ShopifyLogo,
  WhatsAppPaymentLogo,
  WooCommerceLogo,
  ZapierLogo,
  ZohoLogo,
} from "@/components/integrations/logos";
import { imagesPath } from "@/utils/constants";

/**
 * Registry for the `/integrations` cluster.
 *
 * Mirrors `src/config/tools.ts`: one entry per integration drives the hub cards, the homepage
 * section, cross-links and — for the entries that have a page — the `pageMetadata` sitemap entry.
 * The list follows what the app offers in Settings → Integrations
 * (`components/dashboard/settings/integrations/integrations.config.ts`); add to both.
 *
 * `page: false` means "we integrate with this, but there is no landing page yet". Those render
 * as plain tiles rather than links, so the hub never ships a link to a 404. Adding a page =
 * flip the flag, add a `pageMetadata` entry and add the route.
 */
export const INTEGRATIONS_BASE_PATH = "/integrations";

export type IntegrationGroup = "commerce" | "crm" | "automation" | "more";

export const INTEGRATION_GROUPS: readonly { id: IntegrationGroup; label: string; blurb: string }[] =
  [
    { id: "commerce", label: "Store & POS", blurb: "Orders, customers and points" },
    { id: "crm", label: "CRM", blurb: "Contacts and deals, both ways" },
    { id: "automation", label: "Automation", blurb: "Thousands of other apps" },
    { id: "more", label: "Payments, booking & data", blurb: "Inside your chats and flows" },
  ];

export interface IntegrationDefinition {
  slug: string;
  name: string;
  group: IntegrationGroup;
  /** Two or three words for the tile's second line. */
  role: string;
  /** Card copy on the hub. */
  description: string;
  /** The partner's mark, drawn in the DOM. */
  Mark: ComponentType<{ className?: string }>;
  /** A raster copy on the image CDN, for the hub's canvas hero, which cannot draw a component. */
  logo?: string;
  /** Whether `/integrations/<slug>` exists. */
  page: boolean;
  /** Shown on the product pages' short integration strip. */
  featured?: boolean;
  /** Listing on the partner's own marketplace, when there is one. */
  marketplaceUrl?: string;
}

export const INTEGRATIONS: IntegrationDefinition[] = [
  {
    slug: "shopify",
    name: "Shopify",
    group: "commerce",
    role: "Orders & customers",
    description:
      "One-click install from the Shopify App Store. Orders and customers sync both ways, loyalty points post automatically, and abandoned carts and COD orders get chased on WhatsApp.",
    Mark: ShopifyLogo,
    logo: `${imagesPath}/brand/partners/shopyfy.webp`,
    page: true,
    featured: true,
    marketplaceUrl: "https://apps.shopify.com/rateup",
  },
  {
    slug: "woocommerce",
    name: "WooCommerce",
    group: "commerce",
    role: "Orders & customers",
    description:
      "Connect your store in a few clicks: WhatsApp messages on order status changes, loyalty points on completed orders, rewards as checkout coupons, and your catalog on WhatsApp.",
    Mark: WooCommerceLogo,
    logo: `${imagesPath}/brand/partners/woo.webp`,
    page: true,
    featured: true,
  },
  {
    slug: "petpooja",
    name: "Petpooja",
    group: "commerce",
    role: "POS & billing",
    description:
      "Restaurant billing that talks to your loyalty program. Points are awarded at the counter and redeemed against the bill, with no extra device for the cashier.",
    Mark: PetpoojaLogo,
    logo: `${imagesPath}/brand/partners/petlogo.webp`,
    page: false,
    featured: true,
  },
  {
    slug: "hubspot",
    name: "HubSpot",
    group: "crm",
    role: "CRM sync",
    description:
      "Contacts in step both ways, Leads board leads as HubSpot deals that move with them, and closed WhatsApp conversations and survey responses logged on the contact.",
    Mark: HubSpotLogo,
    page: true,
    featured: true,
  },
  {
    slug: "pipedrive",
    name: "Pipedrive",
    group: "crm",
    role: "CRM sync",
    description:
      "Persons in step both ways, Leads board leads as Pipedrive deals that move, win and lose with them, and closed WhatsApp conversations logged on the person.",
    Mark: PipedriveLogo,
    page: true,
    featured: true,
  },
  {
    slug: "zoho",
    name: "Zoho CRM & Bigin",
    group: "crm",
    role: "CRM sync",
    description: "Keep contacts and leads in step between Zoho CRM or Bigin and the RateUp inbox.",
    Mark: ZohoLogo,
    logo: `${imagesPath}/brand/partners/zoho.webp`,
    page: false,
    featured: true,
  },
  {
    slug: "getlead",
    name: "GetLead",
    group: "crm",
    role: "Lead sync",
    description: "Push leads from your RateUp pipeline into GetLead CRM as they come in.",
    Mark: GetLeadLogo,
    page: false,
  },
  {
    slug: "zapier",
    name: "Zapier",
    group: "automation",
    role: "Thousands of apps",
    description:
      "Trigger WhatsApp campaigns, loyalty events and feedback flows from the thousands of apps Zapier connects to.",
    Mark: ZapierLogo,
    logo: `${imagesPath}/brand/partners/zapier.webp`,
    page: false,
    featured: true,
  },
  {
    slug: "make",
    name: "Make",
    group: "automation",
    role: "Scenarios",
    description: "Start Make scenarios from RateUp events, and send WhatsApp messages from them.",
    Mark: MakeLogo,
    page: false,
  },
  {
    slug: "pabbly",
    name: "Pabbly Connect",
    group: "automation",
    role: "Workflows",
    description:
      "Start Pabbly Connect workflows from RateUp events, and send WhatsApp messages from them.",
    Mark: PabblyLogo,
    page: false,
  },
  {
    slug: "whatsapp-payments",
    name: "WhatsApp Payments",
    group: "more",
    role: "Pay in the chat (India)",
    description:
      "Use the payment gateways linked to your WhatsApp Business account to collect payment for orders right inside the chat.",
    Mark: WhatsAppPaymentLogo,
    page: false,
  },
  {
    slug: "amelia",
    name: "Amelia",
    group: "more",
    role: "Appointment booking",
    description:
      "Offer real free times from your Amelia booking calendar inside a WhatsApp flow, so customers pick a slot without leaving the chat.",
    Mark: AmeliaLogo,
    page: false,
  },
  {
    slug: "google-sheets",
    name: "Google Sheets",
    group: "more",
    role: "Survey responses",
    description: "Send every survey response to its own Google Sheet as it arrives.",
    Mark: GoogleSheetsLogo,
    page: false,
  },
];

/** The developer route for anything without a native connector. */
export const DEVELOPER_DOCS_URL = "https://docs.rateup.app";

export const integrationPath = (slug: string) => `${INTEGRATIONS_BASE_PATH}/${slug}`;

export const getIntegrationBySlug = (slug: string) =>
  INTEGRATIONS.find((integration) => integration.slug === slug);
