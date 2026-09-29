/**
 * Registry for the `/integrations` cluster.
 *
 * Mirrors `src/config/tools.ts`: one entry per integration drives the hub cards, the homepage
 * tiles, cross-links and — for the entries that have a page — the `pageMetadata` sitemap entry.
 *
 * `page: false` means "we integrate with this, but there is no landing page yet". Those render
 * as plain tiles rather than links, so the hub never ships a link to a 404. Adding a page =
 * flip the flag, add a `pageMetadata` entry and add the route.
 */
import { imagesPath } from "@/utils/constants";

export const INTEGRATIONS_BASE_PATH = "/integrations";

export interface IntegrationDefinition {
  slug: string;
  name: string;
  /** Two or three words for the tile's second line. */
  role: string;
  /** Card copy on the hub. */
  description: string;
  logo: string | null;
  /** Whether `/integrations/<slug>` exists. */
  page: boolean;
  /** Listing on the partner's own marketplace, when there is one. */
  marketplaceUrl?: string;
}

export const INTEGRATIONS: IntegrationDefinition[] = [
  {
    slug: "shopify",
    name: "Shopify",
    role: "Orders & customers",
    description:
      "One-click install from the Shopify App Store. Orders and customers sync both ways, loyalty points post automatically, and abandoned carts and COD orders get chased on WhatsApp.",
    logo: `${imagesPath}/landing/logos/shopyfy.png`,
    page: true,
    marketplaceUrl: "https://apps.shopify.com/rateup",
  },
  {
    slug: "woocommerce",
    name: "WooCommerce",
    role: "Orders & customers",
    // Hidden until WooCommerce and HubSpot launch — uncomment to show. (the launch copy)
    // description:
    //   "Connect your store in a few clicks: WhatsApp messages on order status changes, loyalty points on completed orders, rewards as checkout coupons, and your catalog on WhatsApp.",
    description:
      "Connect your WooCommerce store to sync orders and customers, trigger post-purchase feedback and award loyalty points on every paid order.",
    logo: `${imagesPath}/landing/logos/woo.png`,
    page: false,
  },
  {
    slug: "petpooja",
    name: "Petpooja",
    role: "POS & billing",
    description:
      "Restaurant billing that talks to your loyalty program. Points are awarded at the counter and redeemed against the bill, with no extra device for the cashier.",
    logo: `${imagesPath}/landing/logos/petlogo.png`,
    page: false,
  },
  {
    slug: "zoho",
    name: "Zoho",
    role: "CRM sync",
    description:
      "Keep contacts, deals and conversation history in step between Zoho CRM and the RateUp inbox.",
    logo: `${imagesPath}/landing/logos/zoho.png`,
    page: false,
  },
  {
    slug: "zapier",
    name: "Zapier",
    role: "3,000+ apps",
    description:
      "Trigger WhatsApp campaigns, loyalty events and feedback flows from any of the 3,000+ apps Zapier connects to.",
    logo: `${imagesPath}/landing/logos/zapier.png`,
    page: false,
  },
  {
    slug: "rest-api",
    name: "REST API",
    role: "Build your own",
    description:
      "A documented REST API and outbound webhooks for anything without a native connector. Docs at docs.rateup.app.",
    logo: null,
    page: false,
  },
];

export const integrationPath = (slug: string) => `${INTEGRATIONS_BASE_PATH}/${slug}`;

export const getIntegrationBySlug = (slug: string) =>
  INTEGRATIONS.find((integration) => integration.slug === slug);
