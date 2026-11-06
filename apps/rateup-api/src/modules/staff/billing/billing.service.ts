import { z } from "zod";
import type { Prisma } from "../../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { getAllPaymentSubscriptions } from "../../payment/payment.service.js";
import { getAllStripeSubscriptions } from "../../payment/stripe/stripe.service.js";
import { StaffHttpError } from "../staff.errors.js";
import { asUuid, pageArgs, pageQuerySchema, searchTextSchema } from "../staff.schema.js";

const gatewayPlanSelect = {
  id: true,
  planId: true,
  name: true,
  amount: true,
  currency: true,
  period: true,
  interval: true,
  status: true,
} satisfies Prisma.PaymentPlansSelect;

/**
 * The catalog: every tier and add-on, the gateway plans each sells through, and how many
 * orgs are on it. Small by nature (a handful of rows), so unpaginated.
 */
export async function listRateupPlans() {
  const plans = await prisma.rateupPlan.findMany({
    orderBy: [{ planType: "asc" }, { price: { sort: "asc", nulls: "first" } }, { name: "asc" }],
    include: {
      paymentPlan: { select: gatewayPlanSelect },
      monthlyPaymentPlan: { select: gatewayPlanSelect },
      yearlyPaymentPlan: { select: gatewayPlanSelect },
      usdMonthlyPaymentPlan: { select: gatewayPlanSelect },
      usdYearlyPaymentPlan: { select: gatewayPlanSelect },
      stripeProduct: {
        select: {
          id: true,
          productId: true,
          name: true,
          status: true,
          amount: true,
          currency: true,
        },
      },
      _count: { select: { Subscription: true, addons: true } },
    },
  });

  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    displayName: plan.displayName,
    planType: plan.planType,
    badge: plan.badge,
    description: plan.description,
    displayWidgetId: plan.displayWidgetId,
    createdAt: plan.createdAt,
    prices: {
      price: plan.price,
      currency: plan.currency,
      monthly: plan.monthlyPrice,
      yearly: plan.yearlyPrice,
      usdMonthly: plan.usdMonthlyPrice,
      usdYearly: plan.usdYearlyPrice,
    },
    razorpay: {
      legacy: plan.paymentPlan,
      monthly: plan.monthlyPaymentPlan,
      yearly: plan.yearlyPaymentPlan,
      usdMonthly: plan.usdMonthlyPaymentPlan,
      usdYearly: plan.usdYearlyPaymentPlan,
    },
    stripe: plan.stripeProduct,
    features: plan.features,
    orgs: plan._count.Subscription,
    packsSold: plan._count.addons,
  }));
}

/** Which catalog tier links a gateway plan, whichever of the five slots it sits in. */
function linkedTier(...tiers: ({ id: string; name: string; displayName: string | null } | null)[]) {
  const tier = tiers.find(Boolean);
  return tier ? { id: tier.id, name: tier.displayName ?? tier.name } : null;
}

const tierSelect = { select: { id: true, name: true, displayName: true } };

/** Razorpay plans as last synced into the database. No live gateway call. */
export async function listRazorpayPlans() {
  const plans = await prisma.paymentPlans.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      RateupPlan: tierSelect,
      monthlyRateupPlan: tierSelect,
      yearlyRateupPlan: tierSelect,
      usdMonthlyRateupPlan: tierSelect,
      usdYearlyRateupPlan: tierSelect,
    },
  });
  return plans.map((plan) => ({
    id: plan.id,
    planId: plan.planId,
    name: plan.name,
    description: plan.description,
    amount: plan.amount,
    currency: plan.currency,
    period: plan.period,
    interval: plan.interval,
    status: plan.status,
    // Stored as unix seconds.
    createdAt: new Date(plan.createdAt * 1000),
    tier: linkedTier(
      plan.RateupPlan,
      plan.monthlyRateupPlan,
      plan.yearlyRateupPlan,
      plan.usdMonthlyRateupPlan,
      plan.usdYearlyRateupPlan,
    ),
  }));
}

/** Stripe products as last synced into the database. No live gateway call. */
export async function listStripeProducts() {
  const products = await prisma.stripeProducts.findMany({
    orderBy: { createdAt: "desc" },
    include: { RateupPlan: tierSelect },
  });
  return products.map(({ RateupPlan, createdAt, ...product }) => ({
    ...product,
    createdAt: new Date(createdAt * 1000),
    tier: linkedTier(RateupPlan),
  }));
}

/** The org behind each gateway subscription id, from the subscription row or its order. */
async function orgsBySubscriptionId(ids: string[]) {
  const [subscriptions, orders] = await Promise.all([
    prisma.subscription.findMany({
      where: { subscriptionRef: { in: ids } },
      select: { subscriptionRef: true, org: { select: { id: true, name: true } } },
    }),
    prisma.order.findMany({
      where: { subscriptionId: { in: ids } },
      select: { subscriptionId: true, org: { select: { id: true, name: true } } },
    }),
  ]);
  const map = new Map<string, { id: string; name: string }>();
  for (const order of orders)
    if (order.org && order.subscriptionId) map.set(order.subscriptionId, order.org);
  for (const sub of subscriptions) if (sub.subscriptionRef) map.set(sub.subscriptionRef, sub.org);
  return map;
}

const gatewayUnavailable = (gateway: string) =>
  new StaffHttpError(502, "GATEWAY_ERROR", `${gateway} did not answer. Try again in a minute.`);

interface RazorpaySubscriptionRow {
  id: string;
  planName?: string;
  currency?: string;
  amount?: number;
  status: string;
  createdAt: string;
  start: string;
  end: string;
}

interface StripeSubscriptionRow {
  id: string;
  productName: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: number;
  startsAt: number;
  endsAt: number;
}

/** The payment service hands dates back pre-formatted ("22/09/2026 14:05:00", server time). */
function fromRazorpayDisplay(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const [, day, month, year, hour, minute, second] = match.map(Number);
  // Razorpay sends 0 for a period that has not started, which formats as 1970.
  if (year < 2000) return null;
  return new Date(year, month - 1, day, hour, minute, second);
}

/**
 * The gateway's most recent subscriptions, read live (Razorpay keeps no local copy), with
 * the RateUp org each belongs to where one can be found.
 */
export async function listRazorpaySubscriptions() {
  let rows: RazorpaySubscriptionRow[];
  try {
    rows = ((await getAllPaymentSubscriptions()) ?? []) as RazorpaySubscriptionRow[];
  } catch (err) {
    log.warn({ err }, "staff: Razorpay subscriptions could not be read");
    throw gatewayUnavailable("Razorpay");
  }
  const orgs = await orgsBySubscriptionId(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    createdAt: fromRazorpayDisplay(row.createdAt),
    start: fromRazorpayDisplay(row.start),
    end: fromRazorpayDisplay(row.end),
    org: orgs.get(row.id) ?? null,
  }));
}

export async function listStripeSubscriptions() {
  let rows: StripeSubscriptionRow[];
  try {
    rows = ((await getAllStripeSubscriptions()) ?? []).filter(Boolean) as StripeSubscriptionRow[];
  } catch (err) {
    log.warn({ err }, "staff: Stripe subscriptions could not be read");
    throw gatewayUnavailable("Stripe");
  }
  const orgs = await orgsBySubscriptionId(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    // Stripe answers in unix seconds.
    createdAt: new Date(row.createdAt * 1000),
    startsAt: new Date(row.startsAt * 1000),
    endsAt: new Date(row.endsAt * 1000),
    org: orgs.get(row.id) ?? null,
  }));
}

export const ORDER_STATUSES = ["PENDING", "COMPLETE", "FAILED"] as const;
export const ORDER_GATEWAYS = ["razorpay", "stripe", "shopify"] as const;

export const orderListQuerySchema = pageQuerySchema.extend({
  q: searchTextSchema,
  status: z.enum(ORDER_STATUSES).optional(),
  gateway: z.enum(ORDER_GATEWAYS).optional(),
  orgId: z.uuid().optional(),
});
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

function orderWhere(query: Omit<OrderListQuery, "page" | "pageSize">): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];
  if (query.orgId) and.push({ orgId: query.orgId });
  if (query.status) and.push({ status: query.status });
  if (query.gateway === "razorpay") and.push({ planId: { not: null } });
  if (query.gateway === "stripe") and.push({ priceId: { not: null } });
  if (query.gateway === "shopify") and.push({ shopifyPlanId: { not: null } });
  if (query.q) {
    const id = asUuid(query.q);
    const text = { contains: query.q, mode: "insensitive" as const };
    and.push({
      OR: id
        ? [{ id }, { orgId: id }]
        : [
            { name: text },
            { subscriptionId: text },
            { checkoutRefId: text },
            { deletedOrgInfo: text },
            { org: { name: text } },
            { createdBy: { email: text } },
          ],
    });
  }
  return and.length ? { AND: and } : {};
}

function orderGateway(order: {
  planId: string | null;
  priceId: string | null;
  shopifyPlanId: string | null;
}) {
  if (order.planId) return "razorpay";
  if (order.priceId) return "stripe";
  if (order.shopifyPlanId) return "shopify";
  return null;
}

/** Checkouts, newest first, with the payment that settled each one when there is one. */
export async function listOrders(query: OrderListQuery) {
  const where = orderWhere(query);
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      ...pageArgs(query),
      include: {
        org: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        RateupPlan: { select: { id: true, name: true, displayName: true } },
        payment: {
          select: { payId: true, amount: true, currency: true, method: true, createdAt: true },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    data: orders.map((order) => ({
      id: order.id,
      name: order.name,
      createdAt: order.createdAt,
      status: order.status,
      paymentStatus: order.paymentStatus,
      gateway: orderGateway(order),
      subscriptionId: order.subscriptionId,
      subscriptionStatus: order.subscriptionStatus,
      nextChargeAt: order.subscriptionChargeAt,
      endedAt: order.subscriptionEndedAt,
      org: order.org,
      deletedOrgName: order.org ? null : order.deletedOrgInfo,
      createdBy: order.createdBy,
      plan: order.RateupPlan
        ? { id: order.RateupPlan.id, name: order.RateupPlan.displayName ?? order.RateupPlan.name }
        : null,
      payment: order.payment
        ? {
            gatewayId: order.payment.payId,
            // Minor units in the column (paise, cents), major units on the page.
            amount: order.payment.amount / 100,
            currency: order.payment.currency,
            method: order.payment.method,
            paidAt: new Date(order.payment.createdAt * 1000),
          }
        : null,
    })),
  };
}

export const subscriptionListQuerySchema = pageQuerySchema.extend({
  q: searchTextSchema,
  planId: z.uuid().optional(),
  status: z.enum(["active", "expired"]).optional(),
  /** Billed through a gateway (has a subscription ref) or granted by hand / free. */
  billing: z.enum(["gateway", "manual"]).optional(),
  sort: z.enum(["expires", "renewed", "created"]).default("expires"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
export type SubscriptionListQuery = z.infer<typeof subscriptionListQuerySchema>;

/** Every org's subscription row: the billing view of the same orgs the org list shows. */
export async function listSubscriptions(query: SubscriptionListQuery, now = new Date()) {
  const and: Prisma.SubscriptionWhereInput[] = [];
  if (query.planId) and.push({ basePlanId: query.planId });
  if (query.status === "active") and.push({ expiresAt: { gt: now } });
  if (query.status === "expired") and.push({ expiresAt: { lte: now } });
  if (query.billing === "gateway") and.push({ subscriptionRef: { not: null } });
  if (query.billing === "manual") and.push({ subscriptionRef: null });
  if (query.q) {
    const id = asUuid(query.q);
    const text = { contains: query.q, mode: "insensitive" as const };
    and.push({
      OR: id
        ? [{ orgId: id }]
        : [{ org: { name: text } }, { org: { owner: { email: text } } }, { subscriptionRef: text }],
    });
  }
  const where: Prisma.SubscriptionWhereInput = and.length ? { AND: and } : {};
  const orderBy: Prisma.SubscriptionOrderByWithRelationInput[] =
    query.sort === "renewed"
      ? [{ renewedAt: { sort: query.order, nulls: "last" } }, { orgId: "asc" }]
      : query.sort === "created"
        ? [{ createdAt: query.order }, { orgId: "asc" }]
        : [{ expiresAt: query.order }, { orgId: "asc" }];

  const [rows, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      orderBy,
      ...pageArgs(query),
      select: {
        orgId: true,
        createdAt: true,
        renewedAt: true,
        expiresAt: true,
        subscriptionRef: true,
        isAnnualMessageLimit: true,
        org: { select: { name: true, logo: true, owner: { select: { email: true } } } },
        basePlan: { select: { id: true, name: true, displayName: true, price: true } },
      },
    }),
    prisma.subscription.count({ where }),
  ]);

  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    data: rows.map((row) => ({
      orgId: row.orgId,
      orgName: row.org.name,
      orgLogo: row.org.logo,
      ownerEmail: row.org.owner.email,
      plan: row.basePlan
        ? {
            id: row.basePlan.id,
            name: row.basePlan.displayName ?? row.basePlan.name,
            paid: Number(row.basePlan.price ?? 0) > 0,
          }
        : null,
      status: row.expiresAt > now ? "active" : "expired",
      startedAt: row.createdAt,
      renewedAt: row.renewedAt,
      expiresAt: row.expiresAt,
      gatewayRef: row.subscriptionRef,
      annualAllowance: row.isAnnualMessageLimit,
    })),
  };
}
