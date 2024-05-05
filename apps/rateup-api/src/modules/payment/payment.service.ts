import {
  OrderStatus,
  PaymentPlanStatus,
  PaymentStatus,
  PrismaClient,
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

const prisma = new PrismaClient();
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
    total_count: data.period === "monthly" ? 12 : 1,
    quantity: 1,
    customer_notify: 1, //enable notifications
    notes: {
      rateupPlanId: data.rateupPlanId,
      orgId: data?.orgId,
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
    const apiResponse = await axios.get("https://api.razorpay.com/v1/plans", {
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
  await prisma.rateupPlan.updateMany({
    where: {
      displayWidgetId: data?.displayWidgetId,
    },
    data: {
      displayWidgetId: null,
    },
  });
  const plans = await prisma.rateupPlan.create({
    data: {
      name: data.name,
      displayName: data.displayName,
      displayWidgetId: data.displayWidgetId,
      description: data.description,
      planType: data.planType as PaymentPlanType,
      paymentPlan: data?.paymentPlanId
        ? { connect: { id: data?.paymentPlanId } }
        : undefined,
      features: JSON.parse(data.features),
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
  const plans = await prisma.rateupPlan.update({
    data: {
      name: data?.name,
      displayName: data?.displayName,
      displayWidgetId: data?.displayWidgetId,
      description: data?.description,
      planType: data?.planType as PaymentPlanType,
      paymentPlan: data?.paymentPlanId
        ? { connect: { id: data?.paymentPlanId } }
        : undefined,
      features: data?.features,
    },
    where: {
      id: data.id,
    },
  });
  return { code: 200, data: plans };
}

//Delete a Rateup Plan
export async function deleteRateUpPlan(data: rateupPlanParamInput) {
  await prisma.rateupPlan.delete({
    where: { id: data.id },
  });
}

//Webhook action On Subscription charged
export async function updateSubscription(payload) {
  try {
    const { subscription, payment } = payload;
    const { id, notes, current_end } = subscription?.entity;

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
      },
    });

    const updatedOrder = await prisma.order.update({
      where: { subscriptionId: id },
      data: {
        status: OrderStatus.COMPLETE,
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
        },
      });
    } else {
      updatedOrder = await prisma.order.update({
        where: { id: notes?.rateupOrderId },
        data: {
          paymentStatus: PaymentStatus.SUCCESS,
          status: OrderStatus.PENDING,
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

  const res = await axios.get(
    `https://api.razorpay.com/v1/subscriptions/${subscription?.subscriptionRef}/cancel`,
    {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    },
  );

  console.log(res);

  return res?.status;
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
  fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

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
        paymentStatus: true,
        payment: true,
      },
    });

    const planDetailsPromises = orders.map(async (order) => {
      const planDetail = await prisma.paymentPlans.findFirst({
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

      const {
        RateupPlan: { description: planFeatures, planType, displayName },
      } = planDetail;

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
        amount: planDetail.amount,
        currency: planDetail.currency,
        planFeatures,
        planType,
        displayName,
        paymentMethod: order?.payment?.method || "",
        paymentStatus: order.paymentStatus,
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
