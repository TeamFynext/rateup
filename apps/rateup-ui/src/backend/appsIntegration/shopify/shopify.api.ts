import { axiosClient } from "@/backend/apiClient";
import type { RequestPayload } from "@/types/api.ts";
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

export async function getRegisteredWebhooks() {
  return (await axiosClient.get(`${SHOPIFY_BASE_URL}/registered-webhooks`)).data as ShopifyEvents[];
}

export async function updateShopifySession({ shop, data }: { shop: string; data: RequestPayload }) {
  return await axiosClient.put(`${SHOPIFY_BASE_URL}/session/${shop}`, data);
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
