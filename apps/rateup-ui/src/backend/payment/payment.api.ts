import { axiosClient } from "../apiClient";

const PLAN_URL = "/payment/plans";
const SUBSCRIPTION_URL = "/payment/subscriptions";
const PAYMENT_URL = "/payment/";
const PAYMENT_PUBLIC_URL = "/public/payment/";

export const getAllPaymentPlans = async () => (await axiosClient.get(`${PLAN_URL}`)).data;

export const getAllRateupPaymentPlans = async () => {
  try {
    return (await axiosClient.get(`${PAYMENT_PUBLIC_URL}rateup-plans`)).data;
  } catch (error) {
    console.error("Error fetching Rateup payment plans:", error);
    return [];
  }
};

export async function syncRazorPayPlans() {
  return (await axiosClient.post(`/payment/sync-plans`)).data;
}
export async function createRateupPaymentPlan(data) {
  return await axiosClient.post(`${PAYMENT_URL}rateup-plan`, data);
}
export async function updateRateupPaymentPlan(data) {
  return await axiosClient.put(`${PAYMENT_URL}rateup-plan`, data);
}
export async function deleteRateupPaymentPlan(id: string) {
  return await axiosClient.delete(`${PAYMENT_URL}rateup-plan/${id}`);
}
export interface ICreateCheckoutType {
  planId: string;
  planName: string;
  period: string;
  orgId: string;
  isAnnualMessageLimit: boolean;
}

export async function createCheckoutSession(data: ICreateCheckoutType) {
  return await axiosClient.post(`/payment/create-checkout-session`, data);
}

export async function updatePaymentPlan(data) {
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

export async function sendMailPlanSelectDetails(data) {
  return await axiosClient.post(`${PAYMENT_PUBLIC_URL}mail`, data);
}

export async function updateSubscriptionOrder(orderId, data) {
  return await axiosClient.put(`${PAYMENT_URL}order/${orderId}`, data);
}
