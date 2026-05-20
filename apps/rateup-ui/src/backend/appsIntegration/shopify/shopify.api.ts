import type { ShopifyEvents } from "@/types/enums.ts";
import { axiosClient } from "@/backend/apiClient";

const SHOPIFY_BASE_URL = "/integrations/shopify";

export async function getProductsFromShopify() {
  return (await axiosClient.get(`${SHOPIFY_BASE_URL}/products`)).data;
}

export async function getRegisteredWebhooks() {
  return (await axiosClient.get(`${SHOPIFY_BASE_URL}/registered-webhooks`))
    .data as ShopifyEvents[];
}

export async function updateShopifySession({ shop, data }) {
  return await axiosClient.put(`${SHOPIFY_BASE_URL}/session/${shop}`, data);
}

export async function registerShopifyWebhooks() {
  return await axiosClient.post(`${SHOPIFY_BASE_URL}/register-webhooks`, null, {
    timeout: 0,
  });
}

export async function registerShopifyWebhookbyTopic(data: {
  topic: ShopifyEvents;
}) {
  return await axiosClient.post(`${SHOPIFY_BASE_URL}/webhooks/topic`, data, {
    timeout: 0,
  });
}

export async function deleteAllShopifyWebhooks() {
  return await axiosClient.delete(`${SHOPIFY_BASE_URL}/delete-webhooks`);
}

export async function deleteShopifyWebhookByTopic(data: {
  topic: ShopifyEvents;
}) {
  return await axiosClient.delete(`${SHOPIFY_BASE_URL}/webhooks/topic`, {
    data,
  });
}

export async function deleteShopifyIntegrationByShop({ shop }) {
  return await axiosClient.delete(`${SHOPIFY_BASE_URL}/${shop}`);
}
