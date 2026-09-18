import { useMemo } from "react";

import {
  useConversationAddonOffer,
  useOrgInvoices,
  useRateupPaymentsPlans,
  useUserOrgOrders,
} from "@/backend/payment/payment.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import type { PricingPlan } from "@/components/HomePage/pages/Pricing/types.ts";
import { checkExpiry } from "@/components/Premium/ExpiryComponent.tsx";

import type { PaymentOrder } from "./types.ts";

/**
 * Razorpay stores a plan's period as "monthly"/"yearly"; those read awkwardly after a
 * price ("₹24,000 /yearly"). Map to the noun the cadence is actually charged in.
 */
export function cadenceLabel(period: string | undefined) {
  if (period === "yearly" || period === "year") return "year";
  if (period === "monthly" || period === "month") return "month";
  return period ?? "";
}

export function currencySymbol(currency: string | undefined) {
  return currency === "USD" ? "$" : "₹";
}

export function formatAmount(amount: number | string | undefined, currency: string | undefined) {
  if (amount === undefined || amount === null || amount === "") return "";
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return String(amount);
  return numeric.toLocaleString(currency === "INR" ? "en-IN" : "en-US");
}

/**
 * Resolves the gateway plan backing this subscription. A tier links a plan per cadence *and*
 * per currency, and the legacy catalog linked one `paymentPlan`, so candidates span all three.
 *
 * The active order decides: its own `planId`, else the currency charged, else the amount for
 * cadence. With no order, the legacy link wins, then annual — the default cadence.
 */
export function resolveGatewayPlan(
  plan: SPlan | undefined,
  order: PaymentOrder | null,
): SPlanGatewayPlan | undefined {
  const candidates = [
    plan?.paymentPlan,
    plan?.yearlyPaymentPlan,
    plan?.monthlyPaymentPlan,
    plan?.usdYearlyPaymentPlan,
    plan?.usdMonthlyPaymentPlan,
  ].filter((candidate): candidate is SPlanGatewayPlan => Boolean(candidate));
  if (candidates.length === 0) return undefined;

  const byPlanId = order?.planId
    ? candidates.find((candidate) => candidate.planId === order.planId)
    : undefined;
  if (byPlanId) return byPlanId;

  // Keep every candidate when the order names a currency no linked plan carries, rather
  // than rendering nothing at all.
  const sameCurrency = order?.currency
    ? candidates.filter((candidate) => candidate.currency === order.currency)
    : [];
  const pool = sameCurrency.length > 0 ? sameCurrency : candidates;

  const byAmount =
    order?.amount == null
      ? undefined
      : pool.find((candidate) => Number(candidate.amount) === Number(order.amount));

  return byAmount ?? pool[0];
}

/**
 * Everything the billing page reads, in one place: one answer to what the plan is, what it
 * costs and what state it is in, and one `refreshAll` behind the Refresh button.
 */
export function useBillingData() {
  const { data: subscription, refetch: refetchSubscription, isRefetching } = useSubscription();
  const {
    data: orders,
    refetch: refetchOrders,
    isRefetching: isRefetchingOrders,
  } = useUserOrgOrders();
  const {
    data: invoices,
    isPending: invoicesPending,
    refetch: refetchInvoices,
    isRefetching: isRefetchingInvoices,
  } = useOrgInvoices();
  const { data: catalogPlans } = useRateupPaymentsPlans();
  const { data: addonOffer, isPending: addonPending } = useConversationAddonOffer();

  /**
   * The order that *is* the subscription. Conversation packs carry no subscription and would
   * otherwise match an org whose `subscriptionRef` is undefined, pricing the plan from a pack.
   */
  const { activeOrder, latestOrder } = useMemo(() => {
    const planOrders = ((orders?.data ?? []) as PaymentOrder[]).filter(
      (order) => order.planType !== "ADDON",
    );
    const active =
      planOrders.find((order) => order.subscriptionId === subscription?.subscriptionRef) ?? null;
    const [latest = null] = [...planOrders].sort(
      (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
    );
    return { activeOrder: active, latestOrder: latest };
  }, [orders, subscription?.subscriptionRef]);

  const currentPlan: PricingPlan | undefined = useMemo(
    () => catalogPlans?.find((plan: PricingPlan) => plan.id === subscription?.basePlan?.id),
    [catalogPlans, subscription?.basePlan?.id],
  );

  const gatewayPlan = useMemo(
    () => resolveGatewayPlan(subscription?.basePlan, activeOrder),
    [subscription?.basePlan, activeOrder],
  );

  const isFreePlan = Boolean(subscription?.basePlan?.name?.includes("FREE"));
  const isShopifyPlan = Boolean(subscription?.shopifyPlanId);
  const isProcessingPlan = latestOrder?.subscriptionStatus === "pending";

  /**
   * A tier sold by conversation rather than billed by a gateway — Enterprise today. Detected
   * by the absence of a gateway plan, the rule the API uses (`GATEWAY_BILLED_PLAN`).
   */
  const isSalesLedPlan = useMemo(() => {
    const plan = subscription?.basePlan;
    if (!plan || isFreePlan) return false;
    return !(
      plan.paymentPlan ||
      plan.monthlyPaymentPlan ||
      plan.yearlyPaymentPlan ||
      plan.usdMonthlyPaymentPlan ||
      plan.usdYearlyPaymentPlan ||
      plan.stripeProduct
    );
  }, [subscription?.basePlan, isFreePlan]);

  const isCancelled = activeOrder?.subscriptionStatus === "cancelled";
  const isExpired = checkExpiry(subscription?.expiresAt);
  // Only a live gateway subscription can be switched in place. Shopify bills in Shopify,
  // sales-led plans are contracted, and a free/expired/cancelled org has nothing to move.
  const canChangePlan =
    !isFreePlan && !isSalesLedPlan && !isShopifyPlan && !isCancelled && !isProcessingPlan;

  const cost = {
    amount: gatewayPlan?.amount ?? subscription?.basePlan?.stripeProduct?.amount,
    currency: gatewayPlan?.currency ?? subscription?.basePlan?.stripeProduct?.currency,
    cadence: cadenceLabel(gatewayPlan?.period ?? subscription?.basePlan?.stripeProduct?.interval),
  };

  function refreshAll() {
    refetchSubscription();
    refetchOrders();
    refetchInvoices();
  }

  return {
    subscription,
    catalogPlans,
    orders: orders?.data as PaymentOrder[] | undefined,
    invoices,
    invoicesPending,
    currentPlan,
    addonOffer,
    addonPending,
    activeOrder,
    latestOrder,
    cost,
    state: {
      isFreePlan,
      isShopifyPlan,
      isSalesLedPlan,
      isProcessingPlan,
      isCancelled,
      isExpired,
      canChangePlan,
    },
    refreshAll,
    isRefreshing: isRefetching || isRefetchingOrders || isRefetchingInvoices,
  };
}

export type BillingData = ReturnType<typeof useBillingData>;
