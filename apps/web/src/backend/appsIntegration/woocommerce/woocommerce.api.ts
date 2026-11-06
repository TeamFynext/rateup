import { axiosClient } from "../../apiClient";
// The button's settings are one shape for every store (shopifyWidgetSchema in rateup-api).
import type { ShopifyWidgetSettings as StoreWidgetSettings } from "../shopify/shopify.api";

const ROUTE_URL = "integrations/woocommerce";

export type WooTopic = "order.created" | "order.updated" | "customer.created" | "product.updated";

/** The WhatsApp opt-in box the RateUp plugin adds to checkout. A tick is marketing consent. */
export interface WooCheckoutOptIn {
  enabled: boolean;
  /** The text beside the box. */
  label: string;
}

/** The admin's switches for a connected store. */
export interface WooSettings {
  /** New WooCommerce customers become RateUp contacts. */
  syncCustomers: boolean;
  checkoutOptIn: WooCheckoutOptIn;
}

/** The connection as the API shows it; the keys never leave the server. */
export type WooStatus =
  | { connected: false }
  | {
      connected: true;
      storeUrl: string;
      store: { name?: string; currency?: string; country?: string; wcVersion?: string };
      /** Woo's id for RateUp's key, so the admin can find it to revoke it. */
      keyId: number | null;
      connectedAt: string;
      settings: WooSettings;
      /** Whether RateUp reached the plugin last time it tried; null before it has tried. */
      plugin: { installed: boolean; checkedAt: string } | null;
      webhooks: { topic: WooTopic; registered: boolean }[];
      health: { consecutiveFailures: number; lastError: string | null; lastErrorAt: string | null };
    };

export async function getWooStatus() {
  return (await axiosClient.get(`${ROUTE_URL}/status`)).data as WooStatus;
}

/** Checks the address and returns WooCommerce's approval screen to send the admin to. */
export async function startWooConnect(storeUrl: string) {
  return (await axiosClient.post(`${ROUTE_URL}/connect`, { storeUrl })).data as { url: string };
}

export async function updateWooSettings(settings: Partial<WooSettings>) {
  return (await axiosClient.put(`${ROUTE_URL}/settings`, settings)).data as WooStatus;
}

export async function repairWooWebhooks() {
  return (await axiosClient.post(`${ROUTE_URL}/webhooks/repair`)).data as WooStatus;
}

/** The storefront WhatsApp button, shown by the RateUp plugin. */
export interface WooWidgetData {
  settings: StoreWidgetSettings;
  stats: { days: number; opens: number; clicks: number };
  /** False until the button has been saved once. */
  configured: boolean;
  storeUrl: string;
  /** Whether RateUp reached the plugin last time it tried; null before it has tried. */
  plugin: { installed: boolean; checkedAt: string } | null;
}

export async function getWooWidget() {
  return (await axiosClient.get(`${ROUTE_URL}/widget`)).data as WooWidgetData;
}

export async function saveWooWidget(settings: StoreWidgetSettings) {
  return (await axiosClient.put(`${ROUTE_URL}/widget`, settings)).data as WooWidgetData;
}

/** "Check again" after installing the plugin. */
export async function checkWooPlugin() {
  return (await axiosClient.post(`${ROUTE_URL}/plugin/check`)).data as WooWidgetData;
}

export interface WooProductOption {
  id: string;
  name: string;
  image: string | null;
}

/** Published products from the connected store, for an automation rule's product filter. */
export async function getWooProducts(search = "") {
  return (await axiosClient.get(`${ROUTE_URL}/products`, { params: { search } }))
    .data as WooProductOption[];
}
