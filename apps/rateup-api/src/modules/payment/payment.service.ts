import {
  OrderStatus,
  PaymentPlanStatus,
  PaymentStatus,
  SubscriptionStatus,
  type RateupPlan,
} from "../../../generated/prisma/client.js";
import axios from "axios";
import {
  CreateCheckoutInput,
  UpdatePlanInput,
  createRateUpPlanInput,
  rateupPlanParamInput,
  updateRateUpPlanInput,
} from "./payment.schema.js";
import dayjs from "dayjs";
import {
  createEmailBodySubscriptionActivated,
  createEmailBodyTrialSubscriptionActivated,
} from "../../utils/email/payments/subscriptionActivated.js";
import { getRecurringCharge, getShopifyInfo } from "../integrations/shopify/shopify.service.js";
import prisma from "../../utils/prisma.js";
import { notificationQueue } from "../../workers/bullmq/queues/index.js";

const credentials = Buffer.from(
  `${process.env.RAZORPAY_API_KEY}:${process.env.RAZORPAY_API_SECRET}`,
).toString("base64");

// Every `catch (error)` block below reports `error.message` back to the caller;
// under strict mode the catch binding is `unknown`, so narrow it once here.
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export enum PaymentPlanType {
  BASE = "BASE",
  ADDON = "ADDON",
}

//.......create a checkout session............
export async function createCheckoutSession(userId: string, data: CreateCheckoutInput) {
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
    ...(data.trialDays ? { start_at: dayjs().add(data.trialDays, "day").unix() } : {}),
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
        hasTrial: (data.trialDays ?? 0) > 0,
      },
    };
  } catch (error) {
    // Handle errors
    console.error("Error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

//...get razorpay plan list to rateup db
export async function syncPaymentPlans() {
  try {
    const apiResponse = await axios.get("https://api.razorpay.com/v1/plans?count=50", {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    const plansData = apiResponse?.data?.items;

    for (const item of plansData) {
      const existingPlan = await prisma.paymentPlans.findFirst({
        where: { planId: item?.id },
      });

      if (!existingPlan) {
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
          },
        });
      }
    }

    return { success: true, data: plansData };
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
      trialDays: data.trialDays,
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
      ...(data.trialDays !== undefined
        ? {
            trialDays: data.trialDays,
          }
        : {}),
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
export interface RazorpaySubscriptionEntity {
  id?: string;
  charge_at?: number | null;
  current_end?: number;
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
  notes?: { rateupOrderId?: string } | null;
  created_at: number;
}

//Webhook action On Subscription Activated
export async function activateSubscription(payload: RazorpaySubscriptionWebhookPayload) {
  try {
    const { subscription } = payload;
    const { id, charge_at } = subscription?.entity || {};

    console.log("....................Activating Subscription.....................");

    if (id) {
      const subscriptionStatus = await prisma.order.update({
        data: {
          subscriptionStatus: SubscriptionStatus.active,
          ...(!charge_at ? {} : { subscriptionChargeAt: new Date(charge_at * 1000) }),
        },
        where: {
          subscriptionId: id,
        },
      });

      return { success: true, data: subscriptionStatus };
    }
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

//Webhook action On Subscription charged
export async function updateSubscription(payload: RazorpaySubscriptionChargedPayload) {
  try {
    const { subscription, payment } = payload;
    const { id, notes, current_end, charge_at } = subscription?.entity || {};
    if (!current_end) {
      throw new Error("Subscription webhook is missing current_end");
    }

    const rateupPlan = await prisma.rateupPlan.findUnique({
      where: { id: notes?.rateupPlanId },
    });
    if (!rateupPlan) {
      throw new Error(`Rateup plan not found for id ${notes?.rateupPlanId}`);
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { orgId: notes?.orgId },
      data: {
        basePlanId: notes?.rateupPlanId,
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

export async function updateSubscriptionForTrial(
  orgId: string,
  rateupPlanId: string | null,
  subscriptionId: string | null,
  userId: string,
) {
  if (!rateupPlanId) {
    throw new Error("A rateupPlanId is required to start a subscription trial");
  }
  const rateupPlan = await prisma.rateupPlan.findUnique({
    where: { id: rateupPlanId },
    include: {
      paymentPlan: true,
    },
  });
  if (!rateupPlan) {
    throw new Error(`Rateup plan not found for id ${rateupPlanId}`);
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!user) {
    throw new Error(`User not found for id ${userId}`);
  }

  const updatedSubscription = await prisma.subscription.update({
    where: { orgId: orgId },
    data: {
      basePlanId: rateupPlanId,
      features: rateupPlan.features ?? {},
      renewedAt: new Date(),
      subscriptionRef: subscriptionId,
      lastLimitAlertSentAt: null,
      expiresAt: dayjs().add(rateupPlan.trialDays, "day").toDate(),
    },
  });

  const updatedUsageStats = await prisma.usageStats.update({
    where: {
      orgId: orgId,
    },
    data: {
      subscriptionStartDate: new Date(),
      subscriptionEndDate: dayjs().add(rateupPlan.trialDays, "day").toDate(),
      monthlyConversationsCount: 0,
      monthlySurveyResponses: 0,
      monthlyWaSurveyResponses: 0,
      monthlyTemplateMessageCount: 0,
      monthlyAutomationTriggerCount: 0,
      lastMonthlyResettedDate: new Date(),
    },
  });

  console.log("....................updating subscription.....................");

  const msg = {
    to: user.email, // Change to your recipient
    // from: 'hello@rateup.app', // Change to your verified sender
    subject: "Rateup Subscription Trial Started - Rateup.app",
    text: `Rateup Subscription Trial Started`,
    html: await createEmailBodyTrialSubscriptionActivated(
      rateupPlan,
      dayjs(updatedUsageStats.subscriptionEndDate).format("MMMM D, YYYY"),
      user.name ?? "there",
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

  return { success: true, data: updatedSubscription };
}
