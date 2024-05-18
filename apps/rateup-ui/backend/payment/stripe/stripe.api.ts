import { axiosClient } from "../../apiClient";

const STRIPE_URL = "/payment/stripe";

export async function createStripeCheckoutSession(data: any) {
  return await axiosClient.post(`${STRIPE_URL}/create-checkout-session`, data);
}

export async function syncStripeProducts() {
  return (await axiosClient.post(`${STRIPE_URL}/sync-products`)).data;
}

export async function updateStripeProduct(data) {
  return (await axiosClient.put(`${STRIPE_URL}/product`, data)).data;
}

export async function getStripeProducts() {
  return (await axiosClient.get(`${STRIPE_URL}/products`))
    .data as Array<StripeProduct>;
}

export async function getAllStripeSubscriptions() {
  return (await axiosClient.get(`${STRIPE_URL}/subscriptions`))
    .data as Array<StripeSubscription>;
}
