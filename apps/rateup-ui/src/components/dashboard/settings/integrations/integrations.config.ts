import { IconAppWindow, IconKey, IconWebhook } from "@tabler/icons-react";
import type { ComponentType } from "react";

import {
  AmeliaLogo,
  GetLeadLogo,
  GoogleSheetsLogo,
  PetpoojaLogo,
  ShopifyLogo,
  WhatsAppPaymentLogo,
  ZapierLogo,
  ZohoLogo,
} from "@/components/integrations/logos";

export interface IntegrationConfig {
  id: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
  /** `internal` is a RateUp service — its own mark, its own brand tint, nothing to pair with. */
  scope: "external" | "internal";
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
  },
  googlesheet: {
    id: "googlesheet",
    name: "Google Sheets",
    icon: GoogleSheetsLogo,
    description: "Export and sync data with Google Sheets",
    scope: "external",
  },
  amelia: {
    id: "amelia",
    name: "Amelia",
    icon: AmeliaLogo,
    description: "Appointment booking and scheduling integration",
    scope: "external",
  },
  waPayment: {
    id: "waPayment",
    name: "WhatsApp Payment",
    icon: WhatsAppPaymentLogo,
    description: "Enable payment collection via WhatsApp",
    scope: "external",
  },
  petpooja: {
    id: "petpooja",
    name: "Petpooja",
    icon: PetpoojaLogo,
    description: "Restaurant POS integration for order management",
    scope: "external",
  },
  zapier: {
    id: "zapier",
    name: "Zapier",
    icon: ZapierLogo,
    description: "Connect with 5000+ apps and automate workflows",
    scope: "external",
  },
  zoho: {
    id: "zoho",
    name: "Zoho CRM/Bigin",
    icon: ZohoLogo,
    description: "Sync contacts and leads seamlessly with Zoho",
    scope: "external",
  },
  getlead: {
    id: "getlead",
    name: "GetLead CRM",
    icon: GetLeadLogo,
    description: "Push pipeline leads to your GetLead CRM",
    scope: "external",
  },
  apiservice: {
    id: "apiservice",
    name: "API Service",
    icon: IconKey,
    description: "Manage RateUp API access keys",
    scope: "internal",
  },
  widget: {
    id: "widget",
    name: "Widget",
    icon: IconAppWindow,
    description: "Configure your RateUp support widget",
    scope: "internal",
  },
  webhook: {
    id: "webhook",
    name: "Webhook",
    icon: IconWebhook,
    description: "Configure webhook endpoint and event delivery",
    scope: "internal",
  },
};

export const ALL_INTEGRATIONS = Object.values(INTEGRATIONS_CONFIG);
