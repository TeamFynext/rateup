import { axiosClient } from "@/backend/apiClient";
import type { ShopifyEvents } from "@/types/enums.ts";

/** A Shopify product, as the integration's product list returns it. */
export interface ShopifyProduct {
  id: number | string;
  title: string;
  handle?: string;
  status?: string;
  image?: { src?: string } | null;
}

const SHOPIFY_BASE_URL = "/integrations/shopify";

export async function getProductsFromShopify() {
  return (await axiosClient.get(`${SHOPIFY_BASE_URL}/products`)).data as ShopifyProduct[];
}

export interface RevenueByCurrency {
  currency: string;
  /** Decimal string, e.g. "1180.00". */
  amount: string;
}

export interface ReminderFunnel {
  sent: number;
  failed: number;
  delivered: number;
  read: number;
  clicked: number;
  recovered: number;
}

/** What cart reminders sent in a period went on to do; mirrors getShopifyAttribution. */
export interface ShopifyAttribution {
  from: string;
  to: string;
  totals: ReminderFunnel & { revenue: RevenueByCurrency[]; recoveredWithoutReminder: number };
  byRule: Array<
    ReminderFunnel & { ruleId: string; ruleName: string; revenue: RevenueByCurrency[] }
  >;
  byDay: Array<{
    day: string;
    sent: number;
    clicked: number;
    recovered: number;
    revenue: RevenueByCurrency[];
  }>;
}

export async function getShopifyAttribution(params: { from: string; to: string }) {
  return (await axiosClient.get(`${SHOPIFY_BASE_URL}/attribution`, { params })).data
    .data as ShopifyAttribution;
}

/** Where the storefront WhatsApp button shows; mirrors SHOPIFY_WIDGET_PAGES in rateup-api. */
export type ShopifyWidgetPage = "all" | "home" | "product" | "collection" | "cart";

/** The storefront WhatsApp button's settings; mirrors shopifyWidgetSchema in rateup-api. */
export interface ShopifyWidgetSettings {
  enabled: boolean;
  /** The WhatsApp channel shoppers are sent to. */
  channelId: string | null;
  buttonLabel: string;
  greeting: string;
  prefill: string;
  productPrefill: string;
  color: string;
  position: "left" | "right";
  offsetY: number;
  showOn: ShopifyWidgetPage[];
  hideOnMobile: boolean;
}

export interface ShopifyWidgetData {
  settings: ShopifyWidgetSettings;
  /** False until the widget has been saved once. */
  configured: boolean;
  shop: string;
  /** Opens the theme editor with the app embed ready to switch on. */
  themeEditorUrl: string | null;
  stats: { days: number; opens: number; clicks: number };
}

export async function getShopifyWidget() {
  return (await axiosClient.get(`${SHOPIFY_BASE_URL}/widget`)).data.data as ShopifyWidgetData;
}

export async function saveShopifyWidget(settings: ShopifyWidgetSettings) {
  return (await axiosClient.put(`${SHOPIFY_BASE_URL}/widget`, settings)).data
    .data as ShopifyWidgetSettings;
}

export async function getRegisteredWebhooks() {
  return (await axiosClient.get(`${SHOPIFY_BASE_URL}/registered-webhooks`)).data as ShopifyEvents[];
}

/**
 * Links an install to the signed-in org. `claimToken` is the single-use `claim` the API's
 * OAuth callback put in its redirect; a 404 means the shop is unknown, already linked, or
 * the token is bad or expired (the API does not say which).
 */
export async function updateShopifySession({
  shop,
  claimToken,
}: {
  shop: string;
  claimToken: string;
}) {
  return await axiosClient.put(`${SHOPIFY_BASE_URL}/session/${encodeURIComponent(shop)}`, {
    claimToken,
  });
}

export async function registerShopifyWebhooks() {
  return await axiosClient.post(`${SHOPIFY_BASE_URL}/register-webhooks`, null, {
    timeout: 0,
  });
}

export async function registerShopifyWebhookbyTopic(data: { topic: ShopifyEvents }) {
  return await axiosClient.post(`${SHOPIFY_BASE_URL}/webhooks/topic`, data, {
    timeout: 0,
  });
}

export async function deleteAllShopifyWebhooks() {
  return await axiosClient.delete(`${SHOPIFY_BASE_URL}/delete-webhooks`);
}

export async function deleteShopifyWebhookByTopic(data: { topic: ShopifyEvents }) {
  return await axiosClient.delete(`${SHOPIFY_BASE_URL}/webhooks/topic`, {
    data,
  });
}

export async function deleteShopifyIntegrationByShop({ shop }: { shop: string }) {
  return await axiosClient.delete(`${SHOPIFY_BASE_URL}/${shop}`);
}
