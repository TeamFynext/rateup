import type { RequestPayload } from "@/types/api.ts";

import { axiosClient } from "../apiClient";

const PLAN_URL = "/payment/plans";
const SUBSCRIPTION_URL = "/payment/subscriptions";
const PAYMENT_URL = "/payment/";
const PAYMENT_PUBLIC_URL = "/public/payment/";

export const getAllPaymentPlans = async () => (await axiosClient.get(`${PLAN_URL}`)).data;

export const getAllRateupPaymentPlans = async () => {
  try {
    return (await axiosClient.get(`${PAYMENT_PUBLIC_URL}rateup-plans`)).data as RateupPaymentPlan[];
  } catch (error) {
    console.error("Error fetching Rateup payment plans:", error);
    return [];
  }
};

/** A Rateup subscription plan as returned by the public plans endpoint. */
export interface RateupPaymentPlan {
  id: string;
  name: string;
  displayName: string;
  description: string[];
  displayWidgetId?: string;
  planType: string;
  paymentPlanId?: string;
  stripeId: string;
  createdAt: string;
  trialDays: number;
  features?: Partial<SubscriptionFeatures>;
  currency?: string;
  /** Gateway pricing, joined onto the plan by the plans endpoint. */
  paymentPlan?: {
    /** A number for real plans; the enterprise tiers use "Lets Talk!". */
    amount: string | number;
    currency?: string;
    period?: string;
    planId?: string;
  };
  stripeProduct?: StripeProduct;
}

export async function syncRazorPayPlans() {
  return (await axiosClient.post(`/payment/sync-plans`)).data;
}
export async function createRateupPaymentPlan(data: RequestPayload) {
  return await axiosClient.post(`${PAYMENT_URL}rateup-plan`, data);
}
export async function updateRateupPaymentPlan(data: RequestPayload) {
  return await axiosClient.put(`${PAYMENT_URL}rateup-plan`, data);
}
export async function deleteRateupPaymentPlan(id: string) {
  return await axiosClient.delete(`${PAYMENT_URL}rateup-plan/${id}`);
}
export interface ICreateCheckoutType {
  planId: string | undefined;
  planName: string | undefined;
  period: string | undefined;
  orgId: string | undefined;
  isAnnualMessageLimit: boolean;
  rateupPlanId?: string;
  trialDays?: number;
}

export async function createCheckoutSession(data: ICreateCheckoutType) {
  return await axiosClient.post(`/payment/create-checkout-session`, data);
}

export async function updatePaymentPlan(data: RequestPayload) {
  return await axiosClient.put(`${PAYMENT_URL}updateplans`, data);
}

export async function getAllPaymentSubscription() {
  const res = await axiosClient.get(SUBSCRIPTION_URL);
  return res?.data;
}

export async function cancelRazorpaySubscription() {
  const res = await axiosClient.put(`${SUBSCRIPTION_URL}/cancel`);
  return res?.data;
}

export async function getAllOrdersUserOrg() {
  const res = await axiosClient.get(`${PAYMENT_URL}org/orders`);
  return res?.data;
}

export async function getAllPaymentOrders() {
  const res = await axiosClient.get(`${PAYMENT_URL}orders/all`);
  return res?.data;
}

export async function deletePaymentPlan(data: { id: string; planId: string }) {
  return await axiosClient.delete(`${PAYMENT_URL}`, { data });
}

export async function sendMailPlanSelectDetails(data: RequestPayload) {
  return await axiosClient.post(`${PAYMENT_PUBLIC_URL}mail`, data);
}

export async function updateSubscriptionOrder(orderId: string, data: RequestPayload) {
  return await axiosClient.put(`${PAYMENT_URL}order/${orderId}`, data);
}
