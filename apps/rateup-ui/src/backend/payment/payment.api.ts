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

/** One gateway's pricing for a plan, joined on by the plans endpoint. */
export interface RateupGatewayPlan {
  /** A number for real plans; the enterprise tiers use "Lets Talk!". */
  amount: string | number;
  currency?: string;
  period?: string;
  planId?: string;
}

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
  features?: Partial<SubscriptionFeatures>;
  currency?: string;
  /** Ribbon text for the highlighted card ("Most popular"). */
  badge?: string | null;
  /** Reference per-month figure. */
  price?: number | null;
  /** Charged per month on the monthly cadence. */
  monthlyPrice?: number | null;
  /** Charged once per year on the annual cadence. */
  yearlyPrice?: number | null;
  /** The dollar list price, set alongside the rupee one rather than converted from it. */
  usdMonthlyPrice?: number | null;
  usdYearlyPrice?: number | null;
  /** Gateway pricing, joined onto the plan by the plans endpoint. */
  paymentPlan?: RateupGatewayPlan;
  /** The same cadences as plans that charge dollars. */
  usdMonthlyPaymentPlan?: RateupGatewayPlan;
  usdYearlyPaymentPlan?: RateupGatewayPlan;
  /** Cadence-specific gateway plans; `paymentPlan` is the legacy single link. */
  monthlyPaymentPlan?: RateupGatewayPlan;
  yearlyPaymentPlan?: RateupGatewayPlan;
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

/** One invoice row, as `GET /payment/org/invoices` returns it. Amounts are major units. */
export interface OrgInvoice {
  id: string;
  /** The subscription this invoice was raised against. */
  subscriptionId: string;
  status: string;
  amount: number;
  currency: string;
  issuedAt: number | null;
  paidAt: number | null;
  billingStart: number | null;
  billingEnd: number | null;
  /** Razorpay's hosted invoice page, where the PDF download lives. */
  url: string | null;
  paymentId: string | null;
}

export interface ChangePlanResult {
  /** "now" only when the mandate allows a mid-cycle re-price; "cycle_end" otherwise. */
  scheduleChangeAt: "now" | "cycle_end";
  isDowngrade: boolean;
  /** Set when an upgrade asked for immediately had to be deferred, with the reason. */
  deferredReason: string | null;
  status?: string;
  changeScheduledAt: number | null;
}

export interface SubscriptionChangeOptions {
  canChange: boolean;
  /** False when the mandate forbids a mid-cycle change; the switch waits for renewal. */
  canChangeImmediately: boolean;
  reason: string | null;
  currentEnd: number | null;
  hasScheduledChanges: boolean;
  changeScheduledAt: number | null;
}

export async function getSubscriptionChangeOptions() {
  const res = await axiosClient.get(`${SUBSCRIPTION_URL}/change-options`);
  return res?.data as SubscriptionChangeOptions;
}

export async function changeSubscriptionPlan(data: {
  rateupPlanId: string;
  period: "monthly" | "yearly";
}) {
  const res = await axiosClient.put(`${SUBSCRIPTION_URL}/change-plan`, data);
  return res?.data as ChangePlanResult;
}

export async function getOrgInvoices() {
  const res = await axiosClient.get(`${PAYMENT_URL}org/invoices`);
  return res?.data as OrgInvoice[];
}

export async function getAllPaymentOrders() {
  const res = await axiosClient.get(`${PAYMENT_URL}orders/all`);
  return res?.data;
}

export async function deletePaymentPlan(data: { id: string; planId: string }) {
  return await axiosClient.delete(`${PAYMENT_URL}`, { data });
}

export async function updateSubscriptionOrder(orderId: string, data: RequestPayload) {
  return await axiosClient.put(`${PAYMENT_URL}order/${orderId}`, data);
}

/**
 * The conversation add-on as it stands for this org: what it costs, how many packs are
 * still in date, and whether this plan is allowed to buy more.
 *
 * Eligibility is decided by the API and merely reflected here — the purchase endpoint
 * refuses a Free or Enterprise order regardless of what the page renders.
 */
export interface ConversationAddonOffer {
  available: boolean;
  eligible: boolean;
  /** Why not, in the customer's terms. Null when they can buy. */
  reason: string | null;
  /** Packs that have not run out yet. */
  packs: number;
  /** ISO date the last of those packs lapses on, or null when none are held. */
  activeUntil: string | null;
  conversationsPerPack: number;
  /** How long one pack counts for. */
  validDays: number;
  allowance: {
    planMax?: number;
    addonConversations: number;
    effectiveMax?: number;
  };
  currency?: string;
  /** Price of one pack. Null when the catalog does not price it in this currency. */
  price?: number | null;
  rateupPlanId?: string;
  planName?: string;
  displayName?: string;
  description?: string[];
}

/** The one-off Razorpay order that buys packs, ready to hand to the checkout. */
export interface ConversationAddonOrder {
  rateupOrderId: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
  quantity: number;
  planName: string;
  rateupPlanId: string;
}

export async function getConversationAddonOffer() {
  const res = await axiosClient.get(`${SUBSCRIPTION_URL}/conversation-addon`);
  return res?.data as ConversationAddonOffer;
}

export async function createConversationAddonOrder(quantity: number) {
  const res = await axiosClient.post(`${SUBSCRIPTION_URL}/conversation-addon`, { quantity });
  return res?.data as ConversationAddonOrder;
}
