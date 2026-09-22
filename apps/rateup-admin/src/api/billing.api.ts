import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { api } from "./client";
import type { IsoDate, Page } from "./types";

export type GatewayPlanStatus = "NULL" | "LIVE" | "ACTIVE" | "INACTIVE";

export interface GatewayPlan {
  id: string;
  planId: string;
  name: string;
  amount: number;
  currency: string;
  period: string;
  interval: number;
  status: GatewayPlanStatus;
}

export interface RateupPlan {
  id: string;
  name: string;
  displayName: string | null;
  planType: "BASE" | "ADDON";
  badge: string | null;
  description: string[];
  displayWidgetId: string | null;
  createdAt: IsoDate;
  prices: {
    price: number | null;
    currency: string | null;
    monthly: number | null;
    yearly: number | null;
    usdMonthly: number | null;
    usdYearly: number | null;
  };
  razorpay: {
    legacy: GatewayPlan | null;
    monthly: GatewayPlan | null;
    yearly: GatewayPlan | null;
    usdMonthly: GatewayPlan | null;
    usdYearly: GatewayPlan | null;
  };
  stripe: {
    id: string;
    productId: string;
    name: string;
    status: GatewayPlanStatus;
    amount: number;
    currency: string;
  } | null;
  features: unknown;
  orgs: number;
  packsSold: number;
}

export interface LinkedTier {
  id: string;
  name: string;
}

export interface RazorpayPlan {
  id: string;
  planId: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  period: string;
  interval: number;
  status: GatewayPlanStatus;
  createdAt: IsoDate;
  tier: LinkedTier | null;
}

export interface StripeProduct {
  id: string;
  productId: string;
  priceId: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  type: "one_time" | "recurring";
  active: boolean;
  liveMode: boolean;
  status: GatewayPlanStatus;
  createdAt: IsoDate;
  tier: LinkedTier | null;
}

export interface OrgRef {
  id: string;
  name: string;
}

export interface RazorpaySubscription {
  id: string;
  planName?: string;
  amount?: number;
  currency?: string;
  status: string;
  createdAt: IsoDate | null;
  start: IsoDate | null;
  end: IsoDate | null;
  org: OrgRef | null;
}

export interface StripeSubscription {
  id: string;
  productName: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: IsoDate;
  startsAt: IsoDate;
  endsAt: IsoDate;
  org: OrgRef | null;
}

export type OrderStatus = "PENDING" | "COMPLETE" | "FAILED";
export type Gateway = "razorpay" | "stripe" | "shopify";

export interface OrderRow {
  id: string;
  name: string;
  createdAt: IsoDate;
  status: OrderStatus;
  paymentStatus: "PENDING" | "SUCCESS" | "FAILED";
  gateway: Gateway | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  nextChargeAt: IsoDate | null;
  endedAt: IsoDate | null;
  org: OrgRef | null;
  deletedOrgName: string | null;
  createdBy: { id: string; name: string | null; email: string } | null;
  plan: LinkedTier | null;
  payment: {
    gatewayId: string;
    amount: number;
    currency: string;
    method: string;
    paidAt: IsoDate;
  } | null;
}

export interface OrderListParams {
  q?: string;
  status?: OrderStatus;
  gateway?: Gateway;
  page?: number;
  pageSize?: number;
}

export interface SubscriptionRow {
  orgId: string;
  orgName: string;
  orgLogo: string | null;
  ownerEmail: string;
  plan: { id: string; name: string; paid: boolean } | null;
  status: "active" | "expired";
  startedAt: IsoDate;
  renewedAt: IsoDate | null;
  expiresAt: IsoDate;
  gatewayRef: string | null;
  annualAllowance: boolean;
}

export interface SubscriptionListParams {
  q?: string;
  planId?: string;
  status?: "active" | "expired";
  billing?: "gateway" | "manual";
  sort?: "expires" | "renewed" | "created";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

const get = async <T>(url: string, params?: object, signal?: AbortSignal) =>
  (await api.get<T>(url, { params, signal })).data;

export const rateupPlansQueryOptions = queryOptions({
  queryKey: ["staff", "billing", "plans"],
  queryFn: async () => (await get<{ data: RateupPlan[] }>("/billing/plans")).data,
});

export const razorpayPlansQueryOptions = queryOptions({
  queryKey: ["staff", "billing", "razorpay", "plans"],
  queryFn: async () => (await get<{ data: RazorpayPlan[] }>("/billing/razorpay/plans")).data,
});

/** Live from the gateway, so it is not refetched on every visit. */
export const razorpaySubscriptionsQueryOptions = queryOptions({
  queryKey: ["staff", "billing", "razorpay", "subscriptions"],
  queryFn: async () =>
    (await get<{ data: RazorpaySubscription[] }>("/billing/razorpay/subscriptions")).data,
  staleTime: 2 * 60_000,
  retry: false,
});

export const stripeProductsQueryOptions = queryOptions({
  queryKey: ["staff", "billing", "stripe", "products"],
  queryFn: async () => (await get<{ data: StripeProduct[] }>("/billing/stripe/products")).data,
});

export const stripeSubscriptionsQueryOptions = queryOptions({
  queryKey: ["staff", "billing", "stripe", "subscriptions"],
  queryFn: async () =>
    (await get<{ data: StripeSubscription[] }>("/billing/stripe/subscriptions")).data,
  staleTime: 2 * 60_000,
  retry: false,
});

export const orderListQueryOptions = (params: OrderListParams) =>
  queryOptions({
    queryKey: ["staff", "billing", "orders", params],
    queryFn: ({ signal }) => get<Page<OrderRow>>("/billing/orders", params, signal),
    placeholderData: keepPreviousData,
  });

export const subscriptionListQueryOptions = (params: SubscriptionListParams) =>
  queryOptions({
    queryKey: ["staff", "billing", "subscriptions", params],
    queryFn: ({ signal }) => get<Page<SubscriptionRow>>("/billing/subscriptions", params, signal),
    placeholderData: keepPreviousData,
  });
