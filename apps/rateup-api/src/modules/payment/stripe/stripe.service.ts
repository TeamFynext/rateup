import {
  OrderStatus,
  PaymentStatus,
  SubscriptionStatus,
} from "../../../../generated/prisma/client.js";
import { sendAWSEmail } from "../../../utils/email/sendAWSEmail.js";
import axios from "axios";
import { createEmailBodySubscriptionActivated } from "../../../utils/email/payments/subscriptionActivated.js";
import { paymentFailed } from "../../../utils/email/payments/paymentFailed.js";
import prisma from "../../../utils/prisma.js";

const STRIPE_API = "https://api.stripe.com/v1";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createOrder(data, userId) {
  const order = await prisma.order.create({
    data: {
      name: data.planName,
      createdById: userId,
      orgId: data.orgId,
      subscriptionStatus: SubscriptionStatus.none,
      rateupPlanId: data?.rateupPlanId,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
    },
  });
  return order;
}

export async function updateOrder(id, priceId, sessionId) {
  const order = await prisma.order.update({
    where: { id: id },
    data: {
      priceId: priceId,
      subscriptionStatus: SubscriptionStatus.none,
      checkoutRefId: sessionId,
    },
  });

  return order;
}

export async function createStripePayment(invoiceData) {
  if (invoiceData.billing_reason === "subscription_create") {
    const { payment_intent, subscription } = invoiceData;

    let orderId = invoiceData.subscription_details?.metadata?.rateupOrderId;
    let paymentIntentData = await getSinglePaymentIntent(payment_intent);
    let subscriptionData = await getSingleStripeSubscription(subscription);

    const payment = await prisma.payments.create({
      data: {
        payId: payment_intent,
        amount: invoiceData.amount_paid,
        currency: invoiceData.currency.toUpperCase(),
        method: paymentIntentData.payment_method_types[0] || "",
        description: paymentIntentData.description,
        customer_email: invoiceData.customer_email || "",
        customer_phone: invoiceData.customer_phone || "",
        rateupOrderId: invoiceData.subscription_details?.metadata?.rateupOrderId,
        createdAt: invoiceData.status_transitions.paid_at,
      },
    });

    let updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentId: payment.id,
        paymentStatus: PaymentStatus.SUCCESS,
        status: OrderStatus.COMPLETE,
        subscriptionStatus: SubscriptionStatus.active,
        subscriptionId: subscription,
        subscriptionChargeAt: new Date(subscriptionData.current_period_end * 1000),
      },
      include: {
        RateupPlan: true,
      },
    });

    if (updatedOrder) {
      await prisma.subscription.update({
        where: { orgId: updatedOrder?.orgId },
        data: {
          basePlanId: updatedOrder?.rateupPlanId,
          features: updatedOrder.RateupPlan?.features,
          renewedAt: new Date(),
          expiresAt: new Date(subscriptionData.current_period_end * 1000),
          subscriptionRef: subscription,
          lastLimitAlertSentAt: null,
        },
      });

      console.log("Sending stripe subscription summary email....");

      const msg = {
        to: invoiceData.customer_email,
        subject: "Rateup Subscription Activated - Rateup.app",
        text: `We have received a payment of ${invoiceData.amount_paid / 100}`,
        html: createEmailBodySubscriptionActivated(
          updatedOrder?.RateupPlan?.displayName,
          new Date(subscriptionData.current_period_end * 1000),
        ),
      };
      try {
        sendAWSEmail(msg);
      } catch (error) {
        console.error(error);
        throw new Error("Email sending failed. E:" + error);
      }
    }
    return payment;
  } else if (invoiceData.billing_reason === "subscription_cycle") {
    //ACTION ON RECURRING PAYMENT
    const { subscription } = invoiceData;

    let subscriptionData = await getSingleStripeSubscription(subscription);

    const updatedSubscription = await prisma.subscription.update({
      where: { subscriptionRef: subscription },
      data: {
        renewedAt: new Date(),
        expiresAt: new Date(subscriptionData.current_period_end * 1000),
        lastLimitAlertSentAt: null,
      },
      include: {
        basePlan: true,
      },
    });

    const msg = {
      to: invoiceData.customer_email,
      subject: "Rateup Subscription Renewed - Rateup.app",
      text: `We have received a payment of ${invoiceData.amount_paid / 100}`,
      html: createEmailBodySubscriptionActivated(
        updatedSubscription?.basePlan?.displayName,
        new Date(subscriptionData.current_period_end * 1000),
        true,
      ),
    };
    try {
      sendAWSEmail(msg);
    } catch (error) {
      console.error(error);
      throw new Error("Email sending failed. E:" + error);
    }

    return updatedSubscription;
  }
}

export async function handleInvoicePaymentFailed(invoiceData) {
  const { billing_reason, subscription, customer_email } = invoiceData;
  console.log("Sub Id: ", subscription);

  if (billing_reason === "subscription_cycle") {
    console.log("Recurring Payment Failed...", customer_email);

    const msg = {
      to: invoiceData.customer_email,
      subject: "Payment Failed - Rateup Subscription Renewal - Rateup.app",
      text: `Subscription Renewal Failed. Please update your payment method.`,
      html: paymentFailed(true),
    };
    try {
      sendAWSEmail(msg);
    } catch (error) {
      console.error(error);
      throw new Error("Email sending failed. E:" + error);
    }
    // await stripe.subscriptions.del(subscriptionId);
  } else if (billing_reason === "subscription_create") {
    console.log("Subscription Create Payment Failed...", customer_email);

    const msg = {
      to: invoiceData.customer_email,
      subject: "Payment Failed - Rateup.app Subscription",
      text: `Subscription Payment Failed. Please update your payment method.`,
      html: paymentFailed(false),
    };
    try {
      sendAWSEmail(msg);
    } catch (error) {
      console.error(error);
      throw new Error("Email sending failed. E:" + error);
    }

    // await stripe.subscriptions.update(subscriptionId, {cancel_at_period_end: true});
  } else if (billing_reason === "subscription_update") {
    console.log("Subscription Update Payment Failed...", customer_email);
    // await stripe.subscriptions.update(subscriptionId, {cancel_at_period_end: true});
  }
}

export async function processOrder(payload) {
  const { id, subscription } = payload;

  let subscriptionData = await getSingleStripeSubscription(subscription);

  let invoiceData = await getSingleStripeInvoice(subscriptionData.latest_invoice);

  if (invoiceData?.status && invoiceData?.status === "paid") {
    let updatedOrder = await prisma.order.update({
      where: { checkoutRefId: id },
      data: {
        subscriptionStatus: SubscriptionStatus.active,
        subscriptionId: subscription,
        subscriptionChargeAt: new Date(subscriptionData.current_period_end * 1000),
      },
    });
    return updatedOrder;
  } else {
    let updatedOrder = await prisma.order.update({
      where: { checkoutRefId: id },
      data: {
        subscriptionStatus: SubscriptionStatus.pending,
        subscriptionId: subscription,
        subscriptionChargeAt: new Date(subscriptionData.current_period_end * 1000),
      },
    });
    return updatedOrder;
  }
}

export async function syncStripeProducts() {
  const [stripeProductRes, priceRes] = await Promise.all([
    (
      await axios.get(`${STRIPE_API}/products`, {
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        },
      })
    )?.data,
    (
      await axios.get(`${STRIPE_API}/prices`, {
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        },
      })
    )?.data,
  ]);
  const stripeProducts = stripeProductRes?.data;
  const priceList = priceRes?.data;
  const formattedData = [];
  for (const product of stripeProducts) {
    const price = priceList.find((price) => price?.id === product?.default_price);
    formattedData.push({
      name: product?.name,
      description: product?.description,
      createdAt: product?.created,
      active: product?.active,
      liveMode: product?.livemode,
      productId: product?.id,
      priceId: product?.default_price,
      currency: price?.currency,
      amount: price?.unit_amount / 100,
      interval: price?.recurring?.interval,
      intervalCount: price?.recurring?.interval_count,
      type: price.type,
    });
  }
  const existingProducts = (await prisma.stripeProducts.findMany()).map(
    (product) => product.productId,
  );
  const data = existingProducts
    ? formattedData.filter((product) => !existingProducts.includes(product?.productId))
    : formattedData;
  await prisma.stripeProducts.createMany({
    data,
  });
}

export async function getStripeProducts() {
  const res = await prisma.stripeProducts.findMany();
  return res;
}

export async function getSingleStripeInvoice(id) {
  const invoice = (
    await axios.get(`${STRIPE_API}/invoices/${id}`, {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    })
  )?.data;

  return invoice;
}

export async function getSinglePaymentIntent(id) {
  const payment_intent = (
    await axios.get(`${STRIPE_API}/payment_intents/${id}`, {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    })
  )?.data;

  return payment_intent;
}

export async function getSingleStripeSubscription(id) {
  const subscription = (
    await axios.get(`${STRIPE_API}/subscriptions/${id}`, {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    })
  )?.data;

  return subscription;
}

export async function getAllStripeSubscriptions() {
  const subscriptions = (
    await axios.get(`${STRIPE_API}/subscriptions`, {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    })
  )?.data?.data;
  const allStripeProducts = await prisma.stripeProducts.findMany();
  return subscriptions?.map((sub) => {
    const product = allStripeProducts?.find((prod) => prod.productId === sub.plan.product);
    return {
      id: sub.id,
      productName: product.name,
      amount: product.amount,
      currency: product.currency,
      status: sub.status,
      createdAt: sub.created,
      startsAt: sub.current_period_start,
      endsAt: sub.current_period_end,
    };
  });
}

//Cancel Stripe subscription
export async function cancelStripeSubscription(orgId) {
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

  const res = await stripe.subscriptions.cancel(subscription?.subscriptionRef);
  console.log("Cancelling Stripe subscription");

  if (res && res?.id) {
    await prisma.order.update({
      data: {
        subscriptionStatus: SubscriptionStatus.cancelled,
        subscriptionEndedAt: new Date(),
      },
      where: {
        subscriptionId: res?.id,
      },
    });
  }

  return res?.status;
}

export async function updateStripeProduct(productId, data) {
  return await prisma.stripeProducts.update({
    where: {
      productId,
    },
    data,
  });
}

export async function deleteStripeProduct(productId) {
  return await prisma.stripeProducts.delete({
    where: {
      productId,
    },
  });
}
