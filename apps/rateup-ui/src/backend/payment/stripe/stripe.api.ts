import type { RequestPayload } from "@/types/api.ts";

import { axiosClient } from "../../apiClient";

const STRIPE_URL = "/payment/stripe";
const STRIPE_SUBSCRIPTIONS = `${STRIPE_URL}/subscriptions`;

export async function createStripeCheckoutSession(data: any) {
  return await axiosClient.post(`${STRIPE_URL}/create-checkout-session`, data);
}

export async function getCheckoutSession(sessionId: string) {
  return (await axiosClient.get(`${STRIPE_URL}/session-status?session_id=${sessionId}`)).data;
}

export async function syncStripeProducts() {
  return (await axiosClient.post(`${STRIPE_URL}/sync-products`)).data;
}

export async function updateStripeProduct(data: RequestPayload) {
  return (await axiosClient.put(`${STRIPE_URL}/product`, data)).data;
}

export async function deleteStripeProduct(productId: string) {
  return (await axiosClient.delete(`${STRIPE_URL}/product/${productId}`)).data;
}

export async function getStripeProducts() {
  return (await axiosClient.get(`${STRIPE_URL}/products`)).data as Array<StripeProduct>;
}

export async function getAllStripeSubscriptions() {
  return (await axiosClient.get(`${STRIPE_SUBSCRIPTIONS}`)).data as Array<StripeSubscription>;
}

export async function cancelStripeSubscription() {
  const res = await axiosClient.put(`${STRIPE_SUBSCRIPTIONS}/cancel`);
  return res?.data;
}
