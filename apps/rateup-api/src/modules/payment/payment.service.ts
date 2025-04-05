import {
  OrderStatus,
  PaymentPlanStatus,
  PaymentStatus,
  SubscriptionStatus,
} from "@prisma/client";
import axios from "axios";
import {
  CreateCheckoutInput,
  UpdatePlanInput,
  createRateUpPlanInput,
  rateupPlanParamInput,
  updateRateUpPlanInput,
} from "./payment.schema";
import dayjs from "dayjs";
import { createEmailBodySubscriptionActivated } from "../../utils/email/payments/subscriptionActivated";
import { sendAWSEmail } from "../../utils/email/sendAWSEmail";
import {
  getRecurringCharge,
  getShopifyInfo,
} from "../integrations/shopify/shopify.service";
import prisma from "../../utils/prisma";

const credentials = Buffer.from(
  `${process.env.RAZORPAY_API_KEY}:${process.env.RAZORPAY_API_SECRET}`,
).toString("base64");

export enum PaymentPlanType {
  BASE = "BASE",
  ADDON = "ADDON",
}

//.......create a checkout session............
export async function createCheckoutSession(
  userId: string,
  data: CreateCheckoutInput,
) {
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
    const apiResponse = await axios.post(
      "https://api.razorpay.com/v1/subscriptions",
      requestBody,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      },
    );

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
      data: { ...order, subExpiry: apiResponse?.data?.current_end },
    };
  } catch (error) {
    // Handle errors
    console.error("Error:", error);
    return { success: false, error: error.message };
  }
}

//...get razorpay plan list to rateup db
export async function syncPaymentPlans() {
  try {
    const apiResponse = await axios.get(
      "https://api.razorpay.com/v1/plans?count=50",
      {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      },
    );

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
    return { success: false, error: error.message };
  }
}

//...get list of all payment plans
export async function getAllPaymentPlans() {
  try {
    const allItems = await prisma.paymentPlans.findMany();
    return { success: true, data: allItems };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error: error.message };
  }
}

//...get list of RateupPlans
export async function getAllRateupPaymentPlans() {
  const plans = await prisma.rateupPlan.findMany({
    include: {
      paymentPlan: true,
      stripeProduct: true,
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
      paymentPlan: data?.paymentPlanId
        ? { connect: { id: data?.paymentPlanId } }
        : undefined,
      stripeProduct: data?.stripeId
        ? { connect: { id: data?.stripeId } }
        : undefined,
      features: data.features ? JSON.parse(data.features) : null,
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

  const plans = await prisma.rateupPlan.update({
    data: {
      name: data?.name,
      displayName: data?.displayName,
      displayWidgetId: data?.displayWidgetId ?? undefined,
      description: data?.description,
      planType: data?.planType as PaymentPlanType,
      paymentPlan:
        (data?.stripeId || !data?.paymentPlanId?.length) &&
        existingPlan.paymentPlanId
          ? { disconnect: { id: existingPlan.paymentPlanId } }
          : data?.paymentPlanId
            ? { connect: { id: data?.paymentPlanId } }
            : undefined,
      stripeProduct:
        (data?.paymentPlanId || !data?.stripeId?.length) &&
        existingPlan.stripeId
          ? { disconnect: { id: existingPlan.stripeId } }
          : data?.stripeId
            ? { connect: { id: data?.stripeId } }
            : undefined,
      features: data?.features,
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
        features: plans.features,
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

//Webhook action On Subscription Activated
export async function activateSubscription(payload) {
  try {
    const { subscription, payment } = payload;
    const { id, status, charge_at } = subscription?.entity;

    console.log(
      "....................Activating Subscription.....................",
    );

    if (id) {
      const subscriptionStatus = await prisma.order.update({
        data: {
          subscriptionStatus: SubscriptionStatus.active,
          ...(!charge_at
            ? {}
            : { subscriptionChargeAt: new Date(charge_at * 1000) }),
        },
        where: {
          subscriptionId: id,
        },
      });

      return { success: true, data: subscriptionStatus };
    }
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error: error.message };
  }
}

//Webhook action On Subscription charged
export async function updateSubscription(payload) {
  try {
    const { subscription, payment } = payload;
    const { id, notes, current_end, charge_at } = subscription?.entity;

    const rateupPlan = await prisma.rateupPlan.findUnique({
      where: { id: notes?.rateupPlanId },
    });

    const updatedSubscription = await prisma.subscription.update({
      where: { orgId: notes?.orgId },
      data: {
        basePlanId: notes?.rateupPlanId,
        features: rateupPlan.features,
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
        ...(!charge_at
          ? {}
          : { subscriptionChargeAt: new Date(charge_at * 1000) }),
      },
    });

    const updatedUsageStats = await prisma.usageStats.update({
      where: {
        orgId: notes?.orgId,
      },
      data: {
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(current_end * 1000),
        monthlyMessagesCount: 0,
        monthlySurveyResponses: 0,
        monthlyWaSurveyResponses: 0,
        annualMessageCount: notes?.isAnnualMessageLimit ? 0 : undefined,
        lastMonthlyResettedDate: new Date(),
      },
    });

    console.log(
      "....................updating subscription.....................",
    );

    if (updatedOrder) {
      console.log("sending email....");

      const msg = {
        to: payment?.entity?.email, // Change to your recipient
        // from: 'hello@rateup.app', // Change to your verified sender
        subject: "Rateup Subscription Activated - Rateup.app",
        text: `We have received a payment of ${payment.entity.amount / 100}`,
        html: createEmailBodySubscriptionActivated(
          rateupPlan?.displayName,
          new Date(current_end * 1000),
        ),
      };
      try {
        sendAWSEmail(msg);
      } catch (error) {
        console.error(error);
        throw new Error("Email sending failed. E:" + error);
      }
    }

    return { success: true, data: updatedSubscription };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error: error.message };
  }
}

//Webhook action On Payment Captured  // PAYMENT Failed
export async function verifyPayment(data, event) {
  try {
    const {
      id,
      amount,
      currency,
      method,
      description,
      email,
      contact,
      notes,
      created_at,
    } = data;
    const payment = await prisma.payments.create({
      data: {
        payId: id,
        amount: amount,
        currency: currency,
        method: method,
        description: description || "",
        customer_email: email || "",
        customer_phone: contact || "",
        rateupOrderId: notes?.rateupOrderId,
        createdAt: created_at,
      },
    });

    let updatedOrder;
    if (event === "payment.failed") {
      updatedOrder = await prisma.order.update({
        where: { id: notes?.rateupOrderId },
        data: {
          paymentStatus: PaymentStatus.FAILED,
          status: OrderStatus.FAILED,
          subscriptionStatus: SubscriptionStatus.halted,
        },
      });
    } else {
      updatedOrder = await prisma.order.update({
        where: { id: notes?.rateupOrderId },
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
    return { success: false, error: error.message };
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

//Get all razorpay subscriptions
export async function getAllPaymentSubscriptions() {
  const res = await axios.get("https://api.razorpay.com/v1/subscriptions", {
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });
  const allPlans = (await getAllPaymentPlans()).data;
  const subscriptions = res?.data?.items?.map((sub) => {
    const plan = allPlans.find((plan) => plan.planId == sub.plan_id);
    return {
      id: sub.id,
      planName: plan.name,
      currency: plan.currency,
      amount: plan.amount,
      status: sub.status,
      createdAt: dayjs.unix(sub.created_at).format("DD/MM/YYYY HH:mm:ss"),
      start: dayjs.unix(sub.current_start).format("DD/MM/YYYY HH:mm:ss"),
      end: dayjs.unix(sub.current_end).format("DD/MM/YYYY HH:mm:ss"),
    };
  });
  return subscriptions;
}

//Cancel razorpay subscription
export async function cancelRazorpaySubscription(orgId) {
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
    const subscriptionStatus = await prisma.order.update({
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
    const subscriptionStatus = await prisma.order.update({
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

    const planDetailsPromises = filteredOrders.map(async (order) => {
      let planDetail = null;
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
      } else if (order.shopifyPlanId) {
        const integration = await getShopifyInfo(orgId);
        if (integration) {
          const recurringCharge = await getRecurringCharge(
            order.subscriptionId,
            integration,
          );
          if (recurringCharge) {
            const rateupPlan = await prisma.rateupPlan.findFirst({
              where: {
                displayName: recurringCharge?.name,
              },
            });
            planDetail = {
              amount: recurringCharge.price,
              currency: recurringCharge.currency,
              description: rateupPlan.description,
              interval: "monthly",
              RateupPlan: rateupPlan,
            };
          }
        }
      }

      const {
        createdBy: { email, name },
      } = order;

      return {
        id: order.id,
        name: order.name,
        createdAt: order.createdAt,
        createdBy: { email, name },
        status: order.status,
        planId: order.planId,
        amount: planDetail?.amount,
        currency: planDetail?.currency,
        planFeatures: planDetail?.rateupPlan?.description,
        planType: planDetail?.rateupPlan?.planType,
        displayName: planDetail?.rateupPlan?.displayName,
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
    return { success: false, error: error.message };
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
