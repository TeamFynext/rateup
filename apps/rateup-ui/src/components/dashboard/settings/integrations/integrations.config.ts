import { IconAppWindow, IconKey, IconWebhook } from "@tabler/icons-react";
import type { TFunction } from "i18next";
import type { ComponentType } from "react";

import {
  AmeliaLogo,
  GetLeadLogo,
  GoogleSheetsLogo,
  // HubSpotLogo,
  PetpoojaLogo,
  ShopifyLogo,
  // WooCommerceLogo,
  WhatsAppPaymentLogo,
  ZapierLogo,
  ZohoLogo,
} from "@/components/integrations/logos";

/**
 * What a service is for, which is how an admin looks for one: "our CRM", "the store", not
 * the vendor's name. Ordered as the picker lists them.
 */
export const INTEGRATION_CATEGORIES = [
  "crm",
  "commerce",
  "automation",
  "payments",
  "booking",
  "reviews",
  "productivity",
  "developer",
] as const;

export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

/** Literal `t()` calls, one per category, so the extractor sees every label. */
export function categoryLabel(t: TFunction, category: IntegrationCategory): string {
  switch (category) {
    case "crm":
      return t("CRM");
    case "commerce":
      return t("Stores & POS");
    case "automation":
      return t("Automation");
    case "payments":
      return t("Payments");
    case "booking":
      return t("Bookings");
    case "reviews":
      return t("Reviews");
    case "productivity":
      return t("Productivity");
    case "developer":
      return t("Developer");
  }
}

export interface IntegrationConfig {
  id: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
  /** `internal` is a RateUp service — its own mark, its own brand tint, nothing to pair with. */
  scope: "external" | "internal";
  category: IntegrationCategory;
  /**
   * Other words someone might search for — the product's other names, what it replaces.
   * Matched along with the name, the description and the category.
   */
  keywords?: readonly string[];
}

/**
 * One entry per integration, shared by the list, the detail pages and the picker, so a name
 * or a mark is written once. Keys match the `$id` route param.
 */
export const INTEGRATIONS_CONFIG: Record<string, IntegrationConfig> = {
  shopify: {
    id: "shopify",
    name: "Shopify",
    icon: ShopifyLogo,
    description: "Sync products and orders from your Shopify store",
    scope: "external",
    category: "commerce",
    keywords: ["store", "ecommerce", "orders"],
  },
  // Hidden until WooCommerce and HubSpot launch — uncomment to show.
  // woocommerce: {
  //   id: "woocommerce",
  //   name: "WooCommerce",
  //   icon: WooCommerceLogo,
  //   description: "Order surveys, loyalty points and coupons for your WooCommerce store",
  //   scope: "external",
  //   category: "commerce",
  //   keywords: ["wordpress", "store", "ecommerce", "orders", "woo"],
  // },
  googlesheet: {
    id: "googlesheet",
    name: "Google Sheets",
    icon: GoogleSheetsLogo,
    description: "Export and sync data with Google Sheets",
    scope: "external",
    category: "productivity",
    keywords: ["spreadsheet", "export", "google"],
  },
  amelia: {
    id: "amelia",
    name: "Amelia",
    icon: AmeliaLogo,
    description: "Appointment booking and scheduling integration",
    scope: "external",
    category: "booking",
    keywords: ["appointments", "wordpress", "calendar"],
  },
  waPayment: {
    id: "waPayment",
    name: "WhatsApp Payment",
    icon: WhatsAppPaymentLogo,
    description: "Enable payment collection via WhatsApp",
    scope: "external",
    category: "payments",
    keywords: ["razorpay", "payu", "upi", "checkout"],
  },
  petpooja: {
    id: "petpooja",
    name: "Petpooja",
    icon: PetpoojaLogo,
    description: "Restaurant POS integration for order management",
    scope: "external",
    category: "commerce",
    keywords: ["restaurant", "pos", "orders"],
  },
  zapier: {
    id: "zapier",
    name: "Zapier",
    icon: ZapierLogo,
    description: "Connect with 5000+ apps and automate workflows",
    scope: "external",
    category: "automation",
    keywords: ["workflow", "no-code"],
  },
  // Hidden until WooCommerce and HubSpot launch — uncomment to show.
  // hubspot: {
  //   id: "hubspot",
  //   name: "HubSpot",
  //   icon: HubSpotLogo,
  //   description: "Sync contacts and deals with HubSpot CRM",
  //   scope: "external",
  //   category: "crm",
  //   keywords: ["crm", "deals", "contacts", "sales"],
  // },
  zoho: {
    id: "zoho",
    name: "Zoho CRM/Bigin",
    icon: ZohoLogo,
    description: "Sync contacts and leads seamlessly with Zoho",
    scope: "external",
    category: "crm",
    keywords: ["bigin", "leads", "deals"],
  },
  getlead: {
    id: "getlead",
    name: "GetLead CRM",
    icon: GetLeadLogo,
    description: "Push pipeline leads to your GetLead CRM",
    scope: "external",
    category: "crm",
    keywords: ["leads"],
  },
  apiservice: {
    id: "apiservice",
    name: "API Service",
    icon: IconKey,
    description: "Manage RateUp API access keys",
    scope: "internal",
    category: "developer",
    keywords: ["api key", "token"],
  },
  widget: {
    id: "widget",
    name: "Widget",
    icon: IconAppWindow,
    description: "Configure your RateUp support widget",
    scope: "internal",
    category: "developer",
    keywords: ["chat", "website", "embed"],
  },
  webhook: {
    id: "webhook",
    name: "Webhook",
    icon: IconWebhook,
    description: "Configure webhook endpoint and event delivery",
    scope: "internal",
    category: "developer",
    keywords: ["events", "callback"],
  },
};

export const ALL_INTEGRATIONS = Object.values(INTEGRATIONS_CONFIG);
