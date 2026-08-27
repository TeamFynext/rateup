import {
  OrderStatus,
  PaymentPlanStatus,
  PaymentStatus,
  SubscriptionStatus,
  type RateupPlan,
} from "../../../generated/prisma/client.js";
import axios from "axios";

import { log } from "../../utils/logger.js";
import {
  CreateCheckoutInput,
  UpdatePlanInput,
  createRateUpPlanInput,
  rateupPlanParamInput,
  updateRateUpPlanInput,
} from "./payment.schema.js";
import dayjs from "dayjs";
import { createEmailBodySubscriptionActivated } from "../../utils/email/payments/subscriptionActivated.js";
import { getRecurringCharge, getShopifyInfo } from "../integrations/shopify/shopify.service.js";
import prisma from "../../utils/prisma.js";
import { notificationQueue } from "../../workers/bullmq/queues/index.js";
import {
  addonExpiryFrom,
  getAddonEligibility,
  getConversationAllowance,
} from "../subscription/addons.js";
import { CONVERSATION_ADDON } from "../subscription/catalog.js";

const credentials = Buffer.from(
  `${process.env.RAZORPAY_API_KEY}:${process.env.RAZORPAY_API_SECRET}`,
).toString("base64");

// Every `catch (error)` block below reports `error.message` back to the caller;
// under strict mode the catch binding is `unknown`, so narrow it once here.
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** One order can buy a lot of headroom; beyond this it is a conversation with sales. */
export const MAX_PACKS_PER_ORDER = 20;

export enum PaymentPlanType {
  BASE = "BASE",
  ADDON = "ADDON",
}

//.......create a checkout session............
export async function createCheckoutSession(userId: string, data: CreateCheckoutInput) {
  // This endpoint creates recurring subscriptions. A pack is a one-off month-long
  // top-up bought through createConversationAddonOrder, so it must not be sold here —
  // doing so would sign the customer up to a pack that renews forever.
  const target = await prisma.rateupPlan.findUnique({
    where: { id: data.rateupPlanId },
    select: { planType: true },
  });
  if (target?.planType === PaymentPlanType.ADDON) {
    throw new Error("Conversation packs are a one-off purchase, not a subscription.");
  }

  const requestBody = {
    plan_id: data.planId,
    total_count: data.period === "monthly" ? 1200 : 100,
    quantity: 1,
    customer_notify: 1, //enable notifications
    notes: {
      rateupPlanId: data.rateupPlanId,
      orgId: data?.orgId,
      isAnnualMessageLimit: data.isAnnualMessageLimit,
    },
  };

  try {
    const apiResponse = await axios.post("https://api.razorpay.com/v1/subscriptions", requestBody, {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    const subscriptionId = apiResponse?.data?.id;
    const order = await prisma.order.create({
      data: {
        name: data.planName,
        createdById: userId,
        orgId: data.orgId,
        planId: data.planId,
        subscriptionId,
        rateupPlanId: data.rateupPlanId,
        subscriptionStatus: SubscriptionStatus.none,
      },
    });

    return {
      success: true,
      data: {
        ...order,
        subExpiry: apiResponse?.data?.current_end,
      },
    };
  } catch (error) {
    // Handle errors
    console.error("Error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

interface RazorpayPlanListItem {
  id: string;
  period: string;
  interval: number;
  created_at: number;
  item: {
    name: string;
    description?: string | null;
    amount: number;
    currency: string;
    /** Razorpay retires a plan by deactivating its item; the plan itself is never deleted. */
    active?: boolean;
  };
}

//...get razorpay plan list to rateup db
export async function syncPaymentPlans() {
  try {
    const apiResponse = await axios.get("https://api.razorpay.com/v1/plans?count=50", {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    const plansData: RazorpayPlanListItem[] = apiResponse?.data?.items ?? [];

    // A plan is sellable only if a catalog tier links it. The Razorpay account still
    // holds every plan ever created there — years of one-off and superseded products,
    // all of them `active` because Razorpay has no way to retire one — so its flag can
    // only ever take a plan OUT of the catalog, never put one in. Without this the sync
    // walks over the retirement done in `retireLegacyPlans` on every run.
    const catalogTiers = await prisma.rateupPlan.findMany({
      select: { paymentPlanId: true, monthlyPaymentPlanId: true, yearlyPaymentPlanId: true },
    });
    const linked = new Set(
      catalogTiers
        .flatMap((tier) => [
          tier.paymentPlanId,
          tier.monthlyPaymentPlanId,
          tier.yearlyPaymentPlanId,
        ])
        .filter((id): id is string => Boolean(id)),
    );

    let created = 0;
    let deactivated = 0;
    let skipped = 0;

    for (const item of plansData) {
      // Razorpay marks a retired plan's item inactive rather than deleting it.
      const isActiveAtGateway = item.item?.active !== false;

      const existingPlan = await prisma.paymentPlans.findFirst({
        where: { planId: item.id },
      });

      if (existingPlan) {
        const status =
          isActiveAtGateway && linked.has(existingPlan.id)
            ? PaymentPlanStatus.ACTIVE
            : PaymentPlanStatus.INACTIVE;
        if (existingPlan.status !== status) {
          await prisma.paymentPlans.update({ where: { id: existingPlan.id }, data: { status } });
          if (status === PaymentPlanStatus.INACTIVE) deactivated++;
        }
        continue;
      }

      if (!isActiveAtGateway) {
        // Retired at Razorpay and unknown here — no reason to bring it in at all.
        skipped++;
        continue;
      }

      // A plan nothing links yet lands disabled: putting a product on sale is a
      // deliberate act, not a side effect of someone creating a plan in the dashboard.
      await prisma.paymentPlans.create({
        data: {
          planId: item.id,
          amount: item.item.amount / 100,
          currency: item.item.currency,
          name: item.item.name,
          description: item.item.description || null,
          createdAt: item.created_at,
          period: item.period,
          interval: item.interval,
          status: PaymentPlanStatus.INACTIVE,
        },
      });
      created++;
    }

    log.info({ created, deactivated, skipped, seen: plansData.length }, "Synced Razorpay plans");
    return { success: true, data: { created, deactivated, skipped, seen: plansData.length } };
  } catch (error) {
    // Handle errors
    console.error("Error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

//...get list of all payment plans
export async function getAllPaymentPlans() {
  try {
    const allItems = await prisma.paymentPlans.findMany();
    return { success: true, data: allItems };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

//...get list of RateupPlans
export async function getAllRateupPaymentPlans() {
  const plans = await prisma.rateupPlan.findMany({
    include: {
      paymentPlan: true,
      stripeProduct: true,
      monthlyPaymentPlan: true,
      yearlyPaymentPlan: true,
      usdMonthlyPaymentPlan: true,
      usdYearlyPaymentPlan: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  return plans;
}
//Create a Rateup Plan
export async function createRateUpPlan(data: createRateUpPlanInput) {
  if (data?.paymentPlanId) {
    const existData = await prisma.rateupPlan.findFirst({
      where: {
        paymentPlanId: data?.paymentPlanId,
      },
    });
    if (existData) {
      return { code: 400, data: "Payment Plan Id is already in Use" };
    }
  }
  if (data?.stripeId) {
    const existData = await prisma.rateupPlan.findFirst({
      where: {
        stripeId: data?.stripeId,
      },
    });
    if (existData) {
      return { code: 400, data: "Plan is already in Use" };
    }
  }
  if (data?.displayWidgetId) {
    await prisma.rateupPlan.updateMany({
      where: {
        displayWidgetId: data?.displayWidgetId,
      },
      data: {
        displayWidgetId: null,
      },
    });
  }
  const plans = await prisma.rateupPlan.create({
    data: {
      name: data.name,
      displayName: data.displayName,
      displayWidgetId: data.displayWidgetId ?? undefined,
      description: data.description,
      planType: data.planType as PaymentPlanType,
      paymentPlan: data?.paymentPlanId ? { connect: { id: data?.paymentPlanId } } : undefined,
      stripeProduct: data?.stripeId ? { connect: { id: data?.stripeId } } : undefined,
      features: data.features ? JSON.parse(data.features) : null,
      badge: data.badge || null,
      price: data.price,
      currency: data.currency ?? null,
      monthlyPrice: data.monthlyPrice ?? null,
      yearlyPrice: data.yearlyPrice ?? null,
      monthlyPaymentPlan: data?.monthlyPaymentPlanId
        ? { connect: { id: data.monthlyPaymentPlanId } }
        : undefined,
      yearlyPaymentPlan: data?.yearlyPaymentPlanId
        ? { connect: { id: data.yearlyPaymentPlanId } }
        : undefined,
    },
  });
  return { code: 201, data: plans };
}

//Update a Rateup Plan
export async function updateRateUpPlan(data: updateRateUpPlanInput) {
  if (data?.paymentPlanId) {
    const existData = await prisma.rateupPlan.findFirst({
      where: {
        paymentPlanId: data?.paymentPlanId,
        id: {
          not: data?.id,
        },
      },
    });
    if (existData) {
      return { code: 400, data: "Payment Plan Id is already in Use" };
    }
  }
  if (data?.stripeId) {
    const existData = await prisma.rateupPlan.findFirst({
      where: {
        stripeId: data?.stripeId,
        id: {
          not: data?.id,
        },
      },
    });
    if (existData) {
      return { code: 400, data: "Payment Plan Id is already in Use" };
    }
  }
  if (data?.displayWidgetId) {
    await prisma.rateupPlan.updateMany({
      where: {
        displayWidgetId: data?.displayWidgetId,
      },
      data: {
        displayWidgetId: null,
      },
    });
  }

  const existingPlan = await prisma.rateupPlan.findUnique({
    where: {
      id: data?.id,
    },
  });
  if (!existingPlan) {
    throw new Error(`Rateup plan not found for id ${data?.id}`);
  }

  const plans = await prisma.rateupPlan.update({
    data: {
      name: data?.name,
      displayName: data?.displayName,
      displayWidgetId: data?.displayWidgetId ?? undefined,
      description: data?.description,
      planType: data?.planType as PaymentPlanType,
      paymentPlan:
        (data?.stripeId || !data?.paymentPlanId?.length) && existingPlan.paymentPlanId
          ? { disconnect: { id: existingPlan.paymentPlanId } }
          : data?.paymentPlanId
            ? { connect: { id: data?.paymentPlanId } }
            : undefined,
      stripeProduct:
        (data?.paymentPlanId || !data?.stripeId?.length) && existingPlan.stripeId
          ? { disconnect: { id: existingPlan.stripeId } }
          : data?.stripeId
            ? { connect: { id: data?.stripeId } }
            : undefined,
      features:
        typeof data?.features === "string"
          ? data.features
            ? JSON.parse(data.features)
            : undefined
          : data?.features,
      badge: data?.badge || null,
      ...(data.price !== undefined
        ? {
            price: data.price,
          }
        : {}),
      ...(data.currency !== undefined
        ? {
            currency: data.currency,
          }
        : {}),
      ...(data.monthlyPrice !== undefined
        ? {
            monthlyPrice: data.monthlyPrice,
          }
        : {}),
      ...(data.yearlyPrice !== undefined
        ? {
            yearlyPrice: data.yearlyPrice,
          }
        : {}),
      monthlyPaymentPlan:
        data.monthlyPaymentPlanId === undefined
          ? undefined
          : data.monthlyPaymentPlanId
            ? { connect: { id: data.monthlyPaymentPlanId } }
            : existingPlan.monthlyPaymentPlanId
              ? { disconnect: true }
              : undefined,
      yearlyPaymentPlan:
        data.yearlyPaymentPlanId === undefined
          ? undefined
          : data.yearlyPaymentPlanId
            ? { connect: { id: data.yearlyPaymentPlanId } }
            : existingPlan.yearlyPaymentPlanId
              ? { disconnect: true }
              : undefined,
    },
    where: {
      id: data.id,
    },
  });
  if (data.features) {
    await prisma.subscription.updateMany({
      where: {
        basePlanId: plans.id,
      },
      data: {
        features: plans.features ?? {},
      },
    });
  }
  return { code: 200, data: plans };
}

//Delete a Rateup Plan
export async function deleteRateUpPlan(data: rateupPlanParamInput) {
  await prisma.rateupPlan.delete({
    where: { id: data.id },
  });
}

// Razorpay webhook payload shapes — only the fields these handlers actually
// read off each event. Notes are whatever this codebase put on the
// subscription/order when it was created (see `createCheckoutSession` above
// and the one-off razorpay payment flow that stamps `rateupOrderId`).
/** The org behind a gateway subscription, for a payload whose notes are missing or stale. */
async function orgIdForSubscription(subscriptionId: string | undefined) {
  if (!subscriptionId) return null;
  const order = await prisma.order.findFirst({
    where: { subscriptionId },
    select: { orgId: true },
  });
  return order?.orgId ?? null;
}

export interface RazorpaySubscriptionEntity {
  id?: string;
  /** How many packs, for an add-on subscription. Razorpay carries it on the entity. */
  quantity?: number;
  /** The gateway plan currently linked. Authoritative once plans can change in-flight. */
  plan_id?: string;
  /** True while a downgrade is queued for the end of the current cycle. */
  has_scheduled_changes?: boolean;
  change_scheduled_at?: number | null;
  charge_at?: number | null;
  current_end?: number;
  ended_at?: number | null;
  notes?: {
    rateupPlanId?: string;
    orgId?: string;
    isAnnualMessageLimit?: string;
  } | null;
}

export interface RazorpaySubscriptionWebhookPayload {
  subscription?: { entity?: RazorpaySubscriptionEntity };
}

export interface RazorpaySubscriptionChargedPayload extends RazorpaySubscriptionWebhookPayload {
  // `amount` is in paise; `currency` is the ISO code Razorpay charged in.
  payment?: { entity?: { email?: string; amount: number; currency?: string } };
}

export interface RazorpayPaymentWebhookData {
  id: string;
  amount: number;
  currency: string;
  method: string;
  description?: string;
  email?: string;
  contact?: string;
  /** Stamped when the order is created. An add-on order also carries what it bought. */
  notes?: { rateupOrderId?: string; orgId?: string; addonQuantity?: string } | null;
  created_at: number;
}

// Razorpay's subscription lifecycle, mapped onto the statuses the schema already
// models. Every one of these events says only "the subscription moved to this state" —
// the money-moving event is `subscription.charged`, handled separately below, which is
// the sole place an org's entitlements are granted.
//
// Deliberately absent: `paused`/`resumed` (no matching status, and this codebase never
// pauses a subscription), `updated` (nothing here changes a plan in-flight), and
// `payment.authorized` (pre-capture; `payment.captured` is the real signal).
const SUBSCRIPTION_STATUS_BY_EVENT = {
  "subscription.authenticated": SubscriptionStatus.authenticated,
  "subscription.activated": SubscriptionStatus.active,
  "subscription.pending": SubscriptionStatus.pending,
  "subscription.halted": SubscriptionStatus.halted,
  "subscription.cancelled": SubscriptionStatus.cancelled,
  "subscription.completed": SubscriptionStatus.completed,
} as const;

export type SubscriptionStatusEvent = keyof typeof SUBSCRIPTION_STATUS_BY_EVENT;

/** Terminal states: the subscription will not charge again, so stamp when it ended. */
const TERMINAL_EVENTS = new Set<SubscriptionStatusEvent>([
  "subscription.halted",
  "subscription.cancelled",
  "subscription.completed",
]);

export function isSubscriptionStatusEvent(event?: string): event is SubscriptionStatusEvent {
  return event !== undefined && event in SUBSCRIPTION_STATUS_BY_EVENT;
}

//Webhook action on every subscription lifecycle transition
export async function applySubscriptionStatusEvent(
  event: SubscriptionStatusEvent,
  payload: RazorpaySubscriptionWebhookPayload,
) {
  try {
    const { id, charge_at, ended_at } = payload.subscription?.entity || {};
    if (!id) {
      throw new Error(`${event} webhook is missing subscription.entity.id`);
    }

    const updatedOrder = await prisma.order.update({
      data: {
        subscriptionStatus: SUBSCRIPTION_STATUS_BY_EVENT[event],
        ...(!charge_at ? {} : { subscriptionChargeAt: new Date(charge_at * 1000) }),
        ...(!TERMINAL_EVENTS.has(event)
          ? {}
          : { subscriptionEndedAt: new Date((ended_at ?? Math.floor(Date.now() / 1000)) * 1000) }),
      },
      where: {
        subscriptionId: id,
      },
    });

    return { success: true, data: updatedOrder };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * The Rateup tier behind a Razorpay plan id.
 *
 * A tier links one gateway plan per cadence, so this walks `PaymentPlans.planId` back to
 * whichever tier references it. Needed because `notes` are stamped once at checkout and go
 * stale the moment a subscription changes plan — the plan id on the entity does not.
 */
export async function resolveRateupPlanByGatewayPlanId(planId: string | undefined) {
  if (!planId) return null;

  const paymentPlan = await prisma.paymentPlans.findFirst({ where: { planId } });
  if (!paymentPlan) return null;

  return prisma.rateupPlan.findFirst({
    where: {
      OR: [
        { monthlyPaymentPlanId: paymentPlan.id },
        { yearlyPaymentPlanId: paymentPlan.id },
        // Without these a dollar-billed renewal resolves to nothing and falls back to the
        // stale `notes` stamped at checkout.
        { usdMonthlyPaymentPlanId: paymentPlan.id },
        { usdYearlyPaymentPlanId: paymentPlan.id },
      ],
    },
  });
}

//Webhook action On Subscription charged
export async function updateSubscription(payload: RazorpaySubscriptionChargedPayload) {
  try {
    const { subscription, payment } = payload;
    const { id, notes, current_end, charge_at, plan_id } = subscription?.entity || {};
    if (!current_end) {
      throw new Error("Subscription webhook is missing current_end");
    }

    // `plan_id` first: `notes` are stamped at checkout and are stale after a plan change,
    // so trusting them here would re-grant the old tier's features on every renewal.
    const rateupPlan =
      (await resolveRateupPlanByGatewayPlanId(plan_id)) ??
      (notes?.rateupPlanId
        ? await prisma.rateupPlan.findUnique({ where: { id: notes.rateupPlanId } })
        : null);
    if (!rateupPlan) {
      throw new Error(`Rateup plan not found for plan ${plan_id ?? notes?.rateupPlanId}`);
    }

    // Packs are bought outright for a month, not subscribed to, so no pack should ever
    // arrive on this webhook. If one does, the alternative — falling through — would swap
    // the customer's tier for a conversation pack, downgrading a Max subscriber to 5,000
    // conversations for paying us more money. Refuse loudly instead.
    if (rateupPlan.planType === PaymentPlanType.ADDON) {
      throw new Error(
        `Subscription ${id} is on add-on plan ${rateupPlan.name}; add-ons are one-off purchases.`,
      );
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { orgId: notes?.orgId },
      data: {
        basePlanId: rateupPlan.id,
        features: rateupPlan.features ?? {},
        renewedAt: new Date(),
        expiresAt: new Date(current_end * 1000),
        subscriptionRef: id,
        lastLimitAlertSentAt: null,
        isAnnualMessageLimit: notes?.isAnnualMessageLimit === "1",
      },
    });

    const updatedOrder = await prisma.order.update({
      where: { subscriptionId: id },
      data: {
        status: OrderStatus.COMPLETE,
        subscriptionStatus: SubscriptionStatus.active,
        ...(!charge_at ? {} : { subscriptionChargeAt: new Date(charge_at * 1000) }),
      },
    });

    await prisma.usageStats.update({
      where: {
        orgId: notes?.orgId,
      },
      data: {
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(current_end * 1000),
        monthlyConversationsCount: 0,
        monthlySurveyResponses: 0,
        monthlyWaSurveyResponses: 0,
        annualConversationsCount: notes?.isAnnualMessageLimit ? 0 : undefined,
        monthlyTemplateMessageCount: 0,
        monthlyAutomationTriggerCount: 0,
        lastMonthlyResettedDate: new Date(),
      },
    });

    console.log("....................updating subscription.....................");

    if (updatedOrder) {
      console.log("sending email....");

      if (!payment?.entity?.email) {
        console.warn("No payment email on subscription-charged webhook; skipping activation email");
      } else {
        const msg = {
          to: payment.entity.email, // Change to your recipient
          // from: 'hello@rateup.app', // Change to your verified sender
          subject: "Rateup Subscription Activated - Rateup.app",
          text: `We have received a payment of ${payment.entity.amount / 100}`,
          html: await createEmailBodySubscriptionActivated(
            rateupPlan.displayName ?? "your plan",
            new Date(current_end * 1000),
            false,
            { amountMinor: payment.entity.amount, currency: payment.entity.currency },
          ),
        };
        try {
          await notificationQueue.add("notification", {
            emailData: msg,
          });
        } catch (error) {
          console.error(error);
          throw new Error("Email sending failed. E:" + error);
        }
      }
    }

    return { success: true, data: updatedSubscription };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

/** What a live subscription will and will not let the customer change. */
export interface SubscriptionChangeOptions {
  canChange: boolean;
  /** False when the mandate forbids a mid-cycle change; the switch must wait for renewal. */
  canChangeImmediately: boolean;
  /** Plain-language reason, shown in the UI when something is not possible. */
  reason: string | null;
  /** When a deferred change would take effect (unix seconds). */
  currentEnd: number | null;
  hasScheduledChanges: boolean;
  changeScheduledAt: number | null;
}

/**
 * Whether this subscription can move plans, and whether it can do so mid-cycle.
 *
 * A card mandate is registered with the bank for a fixed amount and schedule, so Razorpay
 * refuses to re-price it partway through a cycle — "Can't update subscription immediately
 * when card mandate is applicable". Practically every card subscription in India carries
 * one, so the deferred path is the normal path here, not a fallback for odd cases.
 *
 * UPI and eMandate subscriptions cannot be updated at all; those customers have to
 * resubscribe, which registers a fresh mandate.
 */
export async function getSubscriptionChangeOptions(
  orgId: string,
): Promise<SubscriptionChangeOptions> {
  const blocked = (reason: string): SubscriptionChangeOptions => ({
    canChange: false,
    canChangeImmediately: false,
    reason,
    currentEnd: null,
    hasScheduledChanges: false,
    changeScheduledAt: null,
  });

  const subscription = await prisma.subscription.findUnique({
    where: { orgId },
    select: { subscriptionRef: true },
  });

  const subscriptionRef = subscription?.subscriptionRef;
  if (!subscriptionRef?.startsWith("sub_")) {
    return blocked("This organisation has no Razorpay subscription to change.");
  }

  const entity = (
    await axios.get(`https://api.razorpay.com/v1/subscriptions/${subscriptionRef}`, {
      headers: { Authorization: `Basic ${credentials}` },
    })
  ).data;

  if (!["active", "authenticated"].includes(entity?.status)) {
    return blocked(`A ${entity?.status} subscription cannot change plans.`);
  }

  if (["upi", "emandate"].includes(entity?.payment_method)) {
    return blocked(
      "Subscriptions paid by UPI or eMandate cannot change plans. Cancel and resubscribe to move tiers.",
    );
  }

  const hasCardMandate = Boolean(entity?.card_mandate_id);
  return {
    canChange: true,
    canChangeImmediately: !hasCardMandate,
    reason: hasCardMandate
      ? "Your bank mandate is registered for a fixed amount, so plan changes take effect at your next renewal."
      : null,
    currentEnd: entity?.current_end ?? null,
    hasScheduledChanges: Boolean(entity?.has_scheduled_changes),
    changeScheduledAt: entity?.change_scheduled_at ?? null,
  };
}

/**
 * The currency a live subscription bills in, read from the gateway plan its order names.
 *
 * Defaults to INR when nothing can be determined: it is the catalog's default and every
 * subscription created before dollar plans existed charges it.
 */
async function currentBillingCurrency(subscriptionRef: string): Promise<"INR" | "USD"> {
  const order = await prisma.order.findFirst({
    where: { subscriptionId: subscriptionRef },
    select: { planId: true },
  });
  if (!order?.planId) return "INR";

  const gatewayPlan = await prisma.paymentPlans.findFirst({
    where: { planId: order.planId },
    select: { currency: true },
  });
  return gatewayPlan?.currency === "USD" ? "USD" : "INR";
}

/**
 * Moves a live subscription onto a different tier.
 *
 * Timing is chosen by direction, which is the convention customers expect and the only
 * one that avoids owing refunds:
 *
 *   - **Upgrade** applies immediately (`now`) — but only if the mandate allows it. A card
 *     mandate is registered for a fixed amount, and Razorpay refuses to re-price it
 *     mid-cycle, so in practice most upgrades here also land at `cycle_end`. The caller
 *     is told which happened rather than being left to assume.
 *   - **Downgrade** applies at `cycle_end`. They already paid for the current period, so
 *     they keep that tier until it runs out and drop at renewal — no refund, no clawback
 *     of capacity they have already used.
 *
 * Entitlements are NOT granted here. Razorpay confirms the change over
 * `subscription.updated` (and `subscription.charged` for an immediate upgrade), and those
 * handlers are the only place the org's plan moves — same rule as checkout.
 */
export async function changeSubscriptionPlan(orgId: string, rateupPlanId: string, period: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { orgId },
    select: { subscriptionRef: true, basePlanId: true },
  });

  const subscriptionRef = subscription?.subscriptionRef;
  if (!subscriptionRef?.startsWith("sub_")) {
    throw new Error("This organisation has no Razorpay subscription to change");
  }

  const target = await prisma.rateupPlan.findUnique({
    where: { id: rateupPlanId },
    include: {
      monthlyPaymentPlan: true,
      yearlyPaymentPlan: true,
      usdMonthlyPaymentPlan: true,
      usdYearlyPaymentPlan: true,
    },
  });
  if (!target) {
    throw new Error(`Rateup plan not found for id ${rateupPlanId}`);
  }

  // Stay in the currency the org already bills in. A Razorpay plan carries one currency,
  // so handing a dollar subscriber a rupee plan would change what they are charged in
  // as a side effect of picking a different tier.
  const billingCurrency = await currentBillingCurrency(subscriptionRef);
  const targetGatewayPlan =
    billingCurrency === "USD"
      ? period === "monthly"
        ? target.usdMonthlyPaymentPlan
        : target.usdYearlyPaymentPlan
      : period === "monthly"
        ? target.monthlyPaymentPlan
        : target.yearlyPaymentPlan;
  if (!targetGatewayPlan) {
    throw new Error(`${target.displayName} has no ${period} ${billingCurrency} plan to switch to`);
  }

  const currentPlanId = subscription?.basePlanId;
  const current = currentPlanId
    ? await prisma.rateupPlan.findUnique({ where: { id: currentPlanId } })
    : null;
  if (current?.id === target.id) {
    throw new Error("Already on this plan");
  }

  // Compare on the yearly price so a cadence switch does not read as a downgrade purely
  // because a monthly number is smaller than a yearly one.
  const isDowngrade = Number(target.yearlyPrice ?? 0) < Number(current?.yearlyPrice ?? 0);

  const options = await getSubscriptionChangeOptions(orgId);
  if (!options.canChange) {
    throw new Error(options.reason ?? "This subscription cannot change plans.");
  }

  const wantsImmediate = !isDowngrade;
  let scheduleChangeAt: "now" | "cycle_end" =
    wantsImmediate && options.canChangeImmediately ? "now" : "cycle_end";
  let deferredReason = wantsImmediate && scheduleChangeAt === "cycle_end" ? options.reason : null;

  const targetPlanId = targetGatewayPlan.planId;
  async function patch(schedule: "now" | "cycle_end") {
    return axios.patch(
      `https://api.razorpay.com/v1/subscriptions/${subscriptionRef}`,
      {
        plan_id: targetPlanId,
        schedule_change_at: schedule,
        customer_notify: 1,
      },
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
      },
    );
  }

  let res;
  try {
    res = await patch(scheduleChangeAt);
  } catch (error) {
    // Razorpay explains the real reason — a mandate that forbids a mid-cycle re-price, a
    // concurrent change, an offer that forbids the downgrade. Surfacing "Request failed
    // with status code 400" instead would tell the customer nothing.
    const description = axios.isAxiosError(error)
      ? error.response?.data?.error?.description
      : undefined;

    // The pre-check reads the mandate Razorpay reports, but it is not the only reason an
    // immediate change can be refused. Rather than fail an upgrade outright, retry it as
    // a scheduled one and say so — the customer still gets the plan, just at renewal.
    if (scheduleChangeAt === "now" && /immediat|mandate/i.test(description ?? "")) {
      log.warn({ orgId, subscriptionRef, description }, "Falling back to a scheduled change");
      scheduleChangeAt = "cycle_end";
      deferredReason = description ?? null;
      res = await patch(scheduleChangeAt);
    } else {
      throw new Error(description ?? getErrorMessage(error));
    }
  }

  log.info(
    { orgId, subscriptionRef, from: current?.name, to: target.name, scheduleChangeAt },
    "Subscription plan change requested",
  );

  return {
    scheduleChangeAt,
    isDowngrade,
    /** Set when an upgrade the customer asked for immediately had to be deferred. */
    deferredReason,
    status: res?.data?.status,
    changeScheduledAt: res?.data?.change_scheduled_at ?? options.currentEnd,
  };
}

/**
 * Webhook action on `subscription.updated` — a plan change landing.
 *
 * A downgrade scheduled for cycle end reports `has_scheduled_changes`, and must not move
 * the org's entitlements yet: they paid for the current tier through the end of the
 * period. Only an applied change updates the plan.
 */
export async function applySubscriptionUpdate(payload: RazorpaySubscriptionWebhookPayload) {
  try {
    const { id, plan_id, has_scheduled_changes, change_scheduled_at } =
      payload.subscription?.entity || {};
    if (!id) {
      throw new Error("subscription.updated webhook is missing subscription.entity.id");
    }

    if (has_scheduled_changes) {
      log.info({ subscriptionId: id, change_scheduled_at }, "Subscription change scheduled");
      return { success: true, data: { scheduled: true } };
    }

    const rateupPlan = await resolveRateupPlanByGatewayPlanId(plan_id);
    if (!rateupPlan) {
      throw new Error(`Rateup plan not found for plan ${plan_id}`);
    }

    const order = await prisma.order.update({
      where: { subscriptionId: id },
      data: {
        ...(plan_id ? { planId: plan_id } : {}),
        rateupPlanId: rateupPlan.id,
        // displayName is optional on the tier; the order's name column is not.
        ...(rateupPlan.displayName ? { name: rateupPlan.displayName } : {}),
      },
    });

    if (order.orgId) {
      await prisma.subscription.update({
        where: { orgId: order.orgId },
        data: {
          basePlanId: rateupPlan.id,
          features: rateupPlan.features ?? {},
          lastLimitAlertSentAt: null,
        },
      });
    }

    return { success: true, data: order };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

//Webhook action On Payment Captured  // PAYMENT Failed
export async function verifyPayment(data: RazorpayPaymentWebhookData, event: string) {
  try {
    const { id, amount, currency, method, description, email, contact, notes, created_at } = data;
    const rateupOrderId = notes?.rateupOrderId;
    if (!rateupOrderId) {
      throw new Error("Payment webhook is missing notes.rateupOrderId");
    }
    const payment = await prisma.payments.create({
      data: {
        payId: id,
        amount: amount,
        currency: currency,
        method: method,
        description: description || "",
        customer_email: email || "",
        customer_phone: contact || "",
        rateupOrderId,
        createdAt: created_at,
      },
    });

    let _updatedOrder;
    if (event === "payment.failed") {
      _updatedOrder = await prisma.order.update({
        where: { id: rateupOrderId },
        data: {
          paymentStatus: PaymentStatus.FAILED,
          status: OrderStatus.FAILED,
          subscriptionStatus: SubscriptionStatus.halted,
        },
      });
    } else {
      _updatedOrder = await prisma.order.update({
        where: { id: rateupOrderId },
        data: {
          paymentStatus: PaymentStatus.SUCCESS,
          status: OrderStatus.PENDING,
          subscriptionStatus: SubscriptionStatus.pending,
          paymentId: payment.id,
        },
      });
      await creditConversationPacks(rateupOrderId, id, notes);
    }
    return { success: true, data: payment };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

//Update payment plan status - LIVE / ACTIVE / INACTIVE
export async function updatePaymentPlan(plan: UpdatePlanInput) {
  const updatedPlan = await prisma.paymentPlans.update({
    where: {
      id: plan.id,
      planId: plan.planId,
    },
    data: plan.data,
  });
  return updatedPlan;
}

interface RazorpaySubscriptionListItem {
  id: string;
  plan_id: string;
  status: string;
  created_at: number;
  current_start: number;
  current_end: number;
}

//Get all razorpay subscriptions
export async function getAllPaymentSubscriptions() {
  const res = await axios.get("https://api.razorpay.com/v1/subscriptions", {
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });
  const allPlans = (await getAllPaymentPlans()).data;
  const subscriptions = res?.data?.items?.map((sub: RazorpaySubscriptionListItem) => {
    const plan = allPlans?.find((p) => p.planId == sub.plan_id);
    return {
      id: sub.id,
      planName: plan?.name,
      currency: plan?.currency,
      amount: plan?.amount,
      status: sub.status,
      createdAt: dayjs.unix(sub.created_at).format("DD/MM/YYYY HH:mm:ss"),
      start: dayjs.unix(sub.current_start).format("DD/MM/YYYY HH:mm:ss"),
      end: dayjs.unix(sub.current_end).format("DD/MM/YYYY HH:mm:ss"),
    };
  });
  return subscriptions;
}

//Cancel razorpay subscription
export async function cancelRazorpaySubscription(orgId: string) {
  console.log("Cancelling subscription........");

  if (!orgId) {
    throw new Error("Organization data missing");
  }

  const subscription = await prisma.subscription.findUnique({
    where: {
      orgId: orgId,
    },
  });

  if (!subscription || !subscription?.subscriptionRef) {
    throw new Error("Subscription missing");
  }
  if (!subscription.subscriptionRef.startsWith("sub")) {
    await prisma.order.update({
      data: {
        subscriptionStatus: SubscriptionStatus.cancelled,
        subscriptionEndedAt: new Date(),
      },
      where: {
        subscriptionId: subscription.subscriptionRef,
      },
    });
    return;
  }

  const cancelSubscriptionData = {
    cancel_at_cycle_end: 0,
  };

  const res = await axios.post(
    `https://api.razorpay.com/v1/subscriptions/${subscription?.subscriptionRef}/cancel`,
    cancelSubscriptionData,
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (res && res?.data?.id) {
    await prisma.order.update({
      data: {
        subscriptionStatus: SubscriptionStatus.cancelled,
        subscriptionEndedAt: new Date(),
      },
      where: {
        subscriptionId: res?.data?.id,
      },
    });
  }

  console.log(res.data);

  return res?.data?.status;
}

/** Caps the Razorpay round-trips one billing page can trigger. */
const MAX_INVOICE_SUBSCRIPTIONS = 12;

/** One row of the billing page's invoice history. Amounts are in major units. */
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
  /**
   * Razorpay's hosted invoice page. There is no API that returns the PDF directly, so
   * this link — which offers the download — is what "Download invoice" opens.
   */
  url: string | null;
  paymentId: string | null;
}

interface RazorpayInvoiceListItem {
  id: string;
  status: string;
  amount: number;
  currency: string;
  issued_at?: number | null;
  paid_at?: number | null;
  billing_start?: number | null;
  billing_end?: number | null;
  short_url?: string | null;
  payment_id?: string | null;
}

/**
 * Invoice history for an org, read live from Razorpay rather than stored. Every charge on
 * a subscription raises an invoice there, so Razorpay is the authoritative list —
 * mirroring it into Postgres would only add a way for the two to disagree.
 *
 * Queries every subscription the org has ever had, not just the current one: re-subscribing
 * creates a fresh subscription, so scoping to `subscription.subscriptionRef` would hide the
 * entire charge history from before the latest signup. The ids come from the org's orders
 * (one per checkout) plus the live subscription ref, which covers a subscription whose
 * order row was lost.
 *
 * Returns an empty list rather than throwing when the org has no Razorpay subscription at
 * all — free plans, Stripe-billed plans and Shopify plans all land here. Stripe invoices
 * are a separate integration and are not merged in.
 */
export async function getOrgInvoices(orgId: string): Promise<OrgInvoice[]> {
  const [subscription, orders] = await Promise.all([
    prisma.subscription.findUnique({
      where: { orgId },
      select: { subscriptionRef: true },
    }),
    prisma.order.findMany({
      where: { orgId, subscriptionId: { startsWith: "sub_" } },
      select: { subscriptionId: true },
      orderBy: { createdAt: "desc" },
      // A page of history is plenty, and each id costs one Razorpay round-trip.
      take: MAX_INVOICE_SUBSCRIPTIONS,
    }),
  ]);

  const subscriptionIds = [
    ...new Set(
      [subscription?.subscriptionRef, ...orders.map((order) => order.subscriptionId)].filter(
        (id): id is string => Boolean(id?.startsWith("sub_")),
      ),
    ),
  ].slice(0, MAX_INVOICE_SUBSCRIPTIONS);

  if (!subscriptionIds.length) {
    return [];
  }

  const perSubscription = await Promise.all(
    subscriptionIds.map(async (subscriptionId) => {
      try {
        const res = await axios.get("https://api.razorpay.com/v1/invoices", {
          params: { subscription_id: subscriptionId, count: 100 },
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        });
        const items: RazorpayInvoiceListItem[] = res?.data?.items ?? [];
        return items.map((item) => mapInvoice(item, subscriptionId));
      } catch (error) {
        // One unreadable subscription must not blank the whole history — a subscription
        // created under a previous account's keys 400s here and is simply skipped.
        log.warn({ err: error, subscriptionId }, "Skipping invoices for one subscription");
        return [];
      }
    }),
  );

  return perSubscription
    .flat()
    .sort((a, b) => (b.issuedAt ?? b.paidAt ?? 0) - (a.issuedAt ?? a.paidAt ?? 0));
}

function mapInvoice(item: RazorpayInvoiceListItem, subscriptionId: string): OrgInvoice {
  return {
    id: item.id,
    subscriptionId,
    status: item.status,
    // Razorpay bills in paise/cents; the UI shows major units like everything else here.
    amount: item.amount / 100,
    currency: item.currency,
    issuedAt: item.issued_at ?? null,
    paidAt: item.paid_at ?? null,
    billingStart: item.billing_start ?? null,
    billingEnd: item.billing_end ?? null,
    url: item.short_url ?? null,
    paymentId: item.payment_id ?? null,
  };
}

//Get all rateup orders
export async function getAllPaymentOrders() {
  const orders = await prisma.order.findMany({
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      org: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  return orders;
}

//Get organization orders
export async function getAllOrgOrders(orgId: string) {
  const fifteenMinutesAgo = new Date();
  fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15); //cron

  try {
    await prisma.order.updateMany({
      where: {
        paymentStatus: PaymentStatus.PENDING,
        createdAt: {
          lte: fifteenMinutesAgo,
        },
      },
      data: {
        status: OrderStatus.FAILED,
        paymentStatus: PaymentStatus.FAILED,
        subscriptionStatus: SubscriptionStatus.halted,
      },
    });

    const orders = await prisma.order.findMany({
      where: {
        orgId,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        createdBy: true,
        status: true,
        planId: true,
        priceId: true,
        paymentStatus: true,
        payment: true,
        subscriptionId: true,
        subscriptionStatus: true,
        subscriptionChargeAt: true,
        subscriptionEndedAt: true,
        shopifyPlanId: true,
      },
    });

    const filteredOrders = orders.filter(
      (order) => order.planId || order.priceId || order.shopifyPlanId,
    );

    // Only the fields actually read below (see the `return` further down) —
    // each of the three sources (paymentPlans/stripeProducts/shopify) fetches
    // extra columns it doesn't need, which is fine since this is structurally
    // a subset.
    type OrderPlanDetail = {
      amount: number;
      currency: string;
      RateupPlan: Pick<RateupPlan, "description" | "planType" | "displayName"> | null;
    } | null;

    const planDetailsPromises = filteredOrders.map(async (order) => {
      let planDetail: OrderPlanDetail = null;
      if (order.planId) {
        planDetail = await prisma.paymentPlans.findFirst({
          where: {
            planId: order.planId,
          },
          select: {
            amount: true,
            currency: true,
            description: true,
            period: true,
            RateupPlan: true,
          },
        });
      } else if (order.priceId) {
        planDetail = await prisma.stripeProducts.findFirst({
          where: {
            priceId: order.priceId,
          },
          select: {
            amount: true,
            currency: true,
            description: true,
            interval: true,
            RateupPlan: true,
          },
        });
      } else if (order.shopifyPlanId && order.subscriptionId) {
        const integration = await getShopifyInfo(orgId);
        if (integration) {
          const recurringCharge = await getRecurringCharge(order.subscriptionId, integration);
          if (recurringCharge) {
            const rateupPlan = await prisma.rateupPlan.findFirst({
              where: {
                displayName: recurringCharge.name,
              },
            });
            // `price`/`currency` aren't real fields on `ShopifyRecurringCharge` — the
            // pricing actually lives on the first line item's plan.
            const pricing = recurringCharge.lineItems[0]?.plan.pricingDetails.price;
            if (rateupPlan && pricing) {
              planDetail = {
                amount: Number(pricing.amount),
                currency: pricing.currencyCode,
                RateupPlan: rateupPlan,
              };
            }
          }
        }
      }

      const email = order.createdBy?.email;
      const name = order.createdBy?.name;

      return {
        id: order.id,
        name: order.name,
        createdAt: order.createdAt,
        createdBy: { email, name },
        status: order.status,
        planId: order.planId,
        amount: planDetail?.amount,
        currency: planDetail?.currency,
        planFeatures: planDetail?.RateupPlan?.description,
        planType: planDetail?.RateupPlan?.planType,
        displayName: planDetail?.RateupPlan?.displayName,
        paymentMethod: order?.payment?.method || "",
        paymentStatus: order.paymentStatus,
        subscriptionId: order.subscriptionId,
        subscriptionStatus: order.subscriptionStatus,
        subscriptionChargeAt: order.subscriptionChargeAt,
        subscriptionEndedAt: order.subscriptionEndedAt,
      };
    });

    const planDetails = await Promise.all(planDetailsPromises);

    return { success: true, data: planDetails };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deletePaymentPlan(id: string, planId: string) {
  return await prisma.paymentPlans.delete({
    where: {
      id,
      planId,
      status: {
        notIn: [PaymentPlanStatus.ACTIVE, PaymentPlanStatus.LIVE],
      },
    },
  });
}

export async function getRateuplanById(id: string) {
  return await prisma.rateupPlan.findUnique({
    where: {
      id,
    },
  });
}

export async function updateOrder(orderId: string, status: OrderStatus, orgId: string) {
  return await prisma.order.update({
    where: {
      id: orderId,
      orgId,
    },
    data: { status },
  });
}

/**
 * What the billing page needs to show, and possibly sell, conversation packs.
 *
 * The pack is priced in whatever currency the org's plan already bills in — a customer
 * paying dollars is not asked for rupees for the same account — which is the same rule
 * {@link changeSubscriptionPlan} uses when re-pricing a tier. The price comes straight
 * off the catalog row rather than a gateway plan, because a one-off charge names its own
 * amount at the moment the order is created.
 */
export async function getConversationAddonOffer(orgId: string) {
  const [eligibility, allowance, addon, currency] = await Promise.all([
    getAddonEligibility(orgId),
    getConversationAllowance(orgId),
    prisma.rateupPlan.findFirst({ where: { name: CONVERSATION_ADDON.name } }),
    orgBillingCurrency(orgId),
  ]);

  if (!addon) return { available: false as const, ...eligibility, allowance };

  const price = currency === "USD" ? addon.usdMonthlyPrice : addon.monthlyPrice;

  return {
    available: true as const,
    ...eligibility,
    allowance,
    currency,
    // Null when the catalog prices the pack in only one currency; the card explains
    // rather than opening a checkout that could not name an amount.
    price: price ?? null,
    rateupPlanId: addon.id,
    planName: addon.name,
    displayName: addon.displayName,
    description: addon.description,
  };
}

/** The currency an org is billed in, defaulting to rupees when nothing says otherwise. */
async function orgBillingCurrency(orgId: string): Promise<"INR" | "USD"> {
  const subscription = await prisma.subscription.findUnique({
    where: { orgId },
    select: { subscriptionRef: true },
  });
  return subscription?.subscriptionRef
    ? currentBillingCurrency(subscription.subscriptionRef)
    : "INR";
}

/**
 * Creates the one-off Razorpay order that buys `quantity` conversation packs.
 *
 * A pack is charged once and counts for a month, so this is a plain order rather than a
 * subscription — nothing renews, and there is correspondingly nothing to cancel. The
 * packs are *not* credited here: Razorpay confirms over `payment.captured`, and that
 * webhook is the only writer, so a customer who closes the tab mid-payment still gets
 * what they paid for and one who never pays gets nothing.
 */
export async function createConversationAddonOrder(
  userId: string,
  orgId: string,
  quantity: number,
) {
  const packs = Math.min(Math.max(1, Math.trunc(quantity)), MAX_PACKS_PER_ORDER);

  const eligibility = await getAddonEligibility(orgId);
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason ?? "This plan cannot buy conversation packs.");
  }

  const addon = await prisma.rateupPlan.findFirst({ where: { name: CONVERSATION_ADDON.name } });
  if (!addon) throw new Error("Conversation packs are not available yet.");

  const currency = await orgBillingCurrency(orgId);
  const unitPrice = currency === "USD" ? addon.usdMonthlyPrice : addon.monthlyPrice;
  if (!unitPrice) {
    throw new Error(`Conversation packs are not priced in ${currency} yet.`);
  }

  const order = await prisma.order.create({
    data: {
      name: addon.displayName ?? addon.name,
      createdById: userId,
      orgId,
      rateupPlanId: addon.id,
    },
  });

  try {
    // Razorpay takes minor units, and `notes` is what the webhook reads back — the rateup
    // order id ties the payment to this row, and the quantity says how many packs it bought.
    const response = await axios.post(
      "https://api.razorpay.com/v1/orders",
      {
        amount: Math.round(Number(unitPrice) * packs * 100),
        currency,
        notes: {
          rateupOrderId: order.id,
          rateupPlanId: addon.id,
          orgId,
          addonQuantity: String(packs),
        },
      },
      { headers: { Authorization: `Basic ${credentials}` } },
    );

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { checkoutRefId: response.data.id },
    });

    return {
      rateupOrderId: updated.id,
      gatewayOrderId: response.data.id as string,
      amount: Number(unitPrice) * packs,
      currency,
      quantity: packs,
      planName: addon.displayName ?? addon.name,
      rateupPlanId: addon.id,
    };
  } catch (error) {
    // The order row exists only to carry the gateway reference; a failed create would
    // otherwise leave a PENDING order nobody can ever pay.
    await prisma.order.delete({ where: { id: order.id } });
    throw error;
  }
}

/**
 * Credits the packs a captured payment bought, if it bought any.
 *
 * Only add-on orders write a row here; a plan payment falls straight through. The pack
 * dates from the moment it is paid for and lapses on its own {@link ADDON_VALID_DAYS}
 * later — nothing renews it and nothing needs cancelling.
 *
 * `paymentRef` is unique, so a webhook Razorpay retries credits the customer once rather
 * than handing them a second month of headroom for free.
 */
async function creditConversationPacks(
  rateupOrderId: string,
  paymentRef: string,
  notes: RazorpayPaymentWebhookData["notes"],
) {
  const order = await prisma.order.findUnique({
    where: { id: rateupOrderId },
    select: { orgId: true, RateupPlan: { select: { id: true, name: true, planType: true } } },
  });
  const addonPlan = order?.RateupPlan;
  if (!addonPlan || addonPlan.planType !== PaymentPlanType.ADDON) return;

  const orgId = order.orgId ?? notes?.orgId;
  if (!orgId) {
    throw new Error(`Add-on order ${rateupOrderId} has no org to credit`);
  }

  const quantity = Math.max(1, Math.trunc(Number(notes?.addonQuantity ?? 1)) || 1);
  const now = new Date();

  const existing = await prisma.subscriptionAddon.findUnique({ where: { paymentRef } });
  if (existing) return;

  const addon = await prisma.subscriptionAddon.create({
    data: {
      orgId,
      addonPlanId: addonPlan.id,
      quantity,
      paymentRef,
      expiresAt: addonExpiryFrom(now),
    },
  });

  log.info(
    { orgId, addon: addonPlan.name, quantity, expiresAt: addon.expiresAt },
    "Credited conversation packs",
  );
}
