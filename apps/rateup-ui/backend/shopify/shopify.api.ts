import { ShopifyEvents } from "../../types/enums";
import { axiosClient } from "../apiClient";

const SHOPIFY_BASE_URL = "/shopify";

export async function getProductsFromShopify() {
  return (await axiosClient.get(`${SHOPIFY_BASE_URL}/products`)).data;
}

export async function createShopifySurveySchedule(data) {
  return await axiosClient.post(`${SHOPIFY_BASE_URL}/shopify-survey`, data);
}

export async function getShopifySurveySchedulesByOrg() {
  return (await axiosClient.get(`${SHOPIFY_BASE_URL}/shopify-surveys`)).data;
}

export async function deleteShopifySurveySchedule(scheduleId) {
  return await axiosClient.delete(
    `${SHOPIFY_BASE_URL}/shopify-survey/${scheduleId}`,
  );
}

export async function getShopifySession() {
  return (await axiosClient.get(`${SHOPIFY_BASE_URL}/session`)).data;
}

export async function updateShopifySession({ shop, data }) {
  return await axiosClient.put(`${SHOPIFY_BASE_URL}/session/${shop}`, data);
}

export async function registerShopifyWebhooks() {
  return await axiosClient.post(`${SHOPIFY_BASE_URL}/register-webhooks`, null, {
    timeout: 0,
  });
}

export async function deleteAllShopifyWebhooks(shop) {
  return await axiosClient.delete(
    `${SHOPIFY_BASE_URL}/delete-webhooks/${shop}`,
  );
}

export async function updateShopifySurveySchedule({ scheduleId, data }) {
  return await axiosClient.put(
    `${SHOPIFY_BASE_URL}/shopify-survey/${scheduleId}`,
    data,
  );
}

export async function deleteShopifySession(shop) {
  return await axiosClient.delete(`${SHOPIFY_BASE_URL}/session/${shop}`);
}
export async function getShopifySchedules() {
  return (await axiosClient.get(`${SHOPIFY_BASE_URL}/shopify-schedules`)).data;
}
