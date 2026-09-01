import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  StripeProductType,
  SubscriptionStatus,
} from "../../../../generated/prisma/client.js";
import { notificationQueue } from "../../../workers/bullmq/queues/index.js";
import axios from "axios";
import { createEmailBodySubscriptionActivated } from "../../../utils/email/payments/subscriptionActivated.js";
import { paymentFailed } from "../../../utils/email/payments/paymentFailed.js";
import { sendSubscriptionPurchasedAlert } from "../../../utils/email/payments/subscriptionPurchasedAlert.js";
import prisma from "../../../utils/prisma.js";
import type { CreateStripeCheckoutInput } from "./stripe.schema.js";

const STRIPE_API = "https://api.stripe.com/v1";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}
const stripe = new Stripe(stripeSecretKey);

// The functions below call Stripe's REST API directly via axios (rather than through the
// Stripe SDK client), so the shapes below describe only the fields this file actually reads
// off each Stripe object type - not the full Stripe API surface. Exported because
// stripe.controller.ts's webhook handler also needs to shape `event.data.object` into these
// (the Stripe SDK's own `Event.Data.Object` type is an intentionally-empty stub).
export interface StripeInvoiceData {
  billing_reason: string;
  payment_intent?: string | null;
  subscription?: string | null;
  subscription_details?: { metadata?: { rateupOrderId?: string } } | null;
  amount_paid: number;
  currency: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  status_transitions: { paid_at: number | null };
  status?: string;
}

interface StripePaymentIntentData {
  payment_method_types: string[];
  description?: string | null;
}

interface StripeSubscriptionData {
  id?: string;
  status?: string;
  created?: number;
  current_period_start?: number;
  current_period_end: number;
  latest_invoice?: string | null;
  plan?: { product?: string };
}

export interface StripeCheckoutSessionPayload {
  id: string;
  subscription: string;
}

interface StripeProductData {
  id: string;
  name: string;
  description: string | null;
  created: number;
  active: boolean;
  livemode: boolean;
  default_price: string | null;
}

interface StripePriceData {
  id: string;
  currency: string;
  unit_amount: number | null;
  type: string;
  recurring?: { interval: string; interval_count: number } | null;
}

export async function createOrder(data: CreateStripeCheckoutInput, userId: string) {
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

export async function findOrderByCheckoutRef(checkoutRefId: string, orgId: string) {
  return prisma.order.findFirst({
    where: { checkoutRefId, orgId },
    select: { id: true },
  });
}

export async function deleteOrder(id: string) {
  return prisma.order.deleteMany({ where: { id } });
}

export async function updateOrder(id: string, priceId: string, sessionId: string) {
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

export async function createStripePayment(invoiceData: StripeInvoiceData) {
  if (invoiceData.billing_reason === "subscription_create") {
    const { payment_intent, subscription } = invoiceData;
    if (!payment_intent || !subscription) {
      throw new Error("Stripe invoice is missing payment_intent or subscription");
    }

    let orderId = invoiceData.subscription_details?.metadata?.rateupOrderId;
    if (!orderId) {
      throw new Error("Stripe invoice is missing subscription_details.metadata.rateupOrderId");
    }
    if (invoiceData.status_transitions.paid_at == null) {
      throw new Error("Stripe invoice is missing status_transitions.paid_at");
    }
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
        rateupOrderId: orderId,
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
      if (!updatedOrder.orgId) {
        throw new Error(`Order ${updatedOrder.id} is missing orgId; cannot update subscription`);
      }
      await prisma.subscription.update({
        where: { orgId: updatedOrder.orgId },
        data: {
          basePlanId: updatedOrder.rateupPlanId,
          features: updatedOrder.RateupPlan?.features ?? {},
          renewedAt: new Date(),
          expiresAt: new Date(subscriptionData.current_period_end * 1000),
          subscriptionRef: subscription,
          lastLimitAlertSentAt: null,
        },
      });

      console.log("Sending stripe subscription summary email....");

      if (invoiceData.customer_email) {
        const msg = {
          to: invoiceData.customer_email,
          subject: "Rateup Subscription Activated - Rateup.app",
          text: `We have received a payment of ${invoiceData.amount_paid / 100}`,
          html: await createEmailBodySubscriptionActivated(
            updatedOrder.RateupPlan?.displayName ?? updatedOrder.RateupPlan?.name ?? "Rateup Plan",
            new Date(subscriptionData.current_period_end * 1000),
            false,
            { amountMinor: invoiceData.amount_paid, currency: invoiceData.currency },
          ),
        };
        try {
          await notificationQueue.add("notification", { emailData: msg });
        } catch (error) {
          console.error(error);
          throw new Error("Email sending failed. E:" + error);
        }
      } else {
        console.log("Skipping subscription summary email: invoice has no customer_email");
      }

      // `subscription_create` is the first invoice of a subscription, so this fires once
      // per subscription — the renewal branch below deliberately does not alert.
      await sendSubscriptionPurchasedAlert({
        orgId: updatedOrder.orgId,
        customerEmail: invoiceData.customer_email ?? undefined,
        planName:
          updatedOrder.RateupPlan?.displayName ?? updatedOrder.RateupPlan?.name ?? "Rateup Plan",
        paid: { amountMinor: invoiceData.amount_paid, currency: invoiceData.currency },
        gateway: "Stripe",
        cycleEndsAt: new Date(subscriptionData.current_period_end * 1000),
      });
    }
    return payment;
  } else if (invoiceData.billing_reason === "subscription_cycle") {
    //ACTION ON RECURRING PAYMENT
    const { subscription } = invoiceData;
    if (!subscription) {
      throw new Error("Stripe invoice is missing subscription");
    }

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

    if (invoiceData.customer_email) {
      const msg = {
        to: invoiceData.customer_email,
        subject: "Rateup Subscription Renewed - Rateup.app",
        text: `We have received a payment of ${invoiceData.amount_paid / 100}`,
        html: await createEmailBodySubscriptionActivated(
          updatedSubscription.basePlan?.displayName ??
            updatedSubscription.basePlan?.name ??
            "Rateup Plan",
          new Date(subscriptionData.current_period_end * 1000),
          true,
          { amountMinor: invoiceData.amount_paid, currency: invoiceData.currency },
        ),
      };
      try {
        await notificationQueue.add("notification", { emailData: msg });
      } catch (error) {
        console.error(error);
        throw new Error("Email sending failed. E:" + error);
      }
    } else {
      console.log("Skipping subscription renewal email: invoice has no customer_email");
    }

    return updatedSubscription;
  }
}

export async function handleInvoicePaymentFailed(invoiceData: StripeInvoiceData) {
  const { billing_reason, subscription, customer_email } = invoiceData;
  console.log("Sub Id: ", subscription);

  if (billing_reason === "subscription_cycle") {
    console.log("Recurring Payment Failed...", customer_email);

    if (customer_email) {
      const msg = {
        to: customer_email,
        subject: "Payment Failed - Rateup Subscription Renewal - Rateup.app",
        text: `Subscription Renewal Failed. Please update your payment method.`,
        html: await paymentFailed(true),
      };
      try {
        await notificationQueue.add("notification", { emailData: msg });
      } catch (error) {
        console.error(error);
        throw new Error("Email sending failed. E:" + error);
      }
    }
    // await stripe.subscriptions.del(subscriptionId);
  } else if (billing_reason === "subscription_create") {
    console.log("Subscription Create Payment Failed...", customer_email);

    if (customer_email) {
      const msg = {
        to: customer_email,
        subject: "Payment Failed - Rateup.app Subscription",
        text: `Subscription Payment Failed. Please update your payment method.`,
        html: await paymentFailed(false),
      };
      try {
        await notificationQueue.add("notification", { emailData: msg });
      } catch (error) {
        console.error(error);
        throw new Error("Email sending failed. E:" + error);
      }
    }

    // await stripe.subscriptions.update(subscriptionId, {cancel_at_period_end: true});
  } else if (billing_reason === "subscription_update") {
    console.log("Subscription Update Payment Failed...", customer_email);
    // await stripe.subscriptions.update(subscriptionId, {cancel_at_period_end: true});
  }
}

export async function processOrder(payload: StripeCheckoutSessionPayload) {
  const { id, subscription } = payload;

  let subscriptionData = await getSingleStripeSubscription(subscription);

  if (!subscriptionData.latest_invoice) {
    throw new Error(`Stripe subscription ${subscription} is missing latest_invoice`);
  }
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
  const stripeProducts: StripeProductData[] = stripeProductRes?.data ?? [];
  const priceList: StripePriceData[] = priceRes?.data ?? [];
  const formattedData: Prisma.StripeProductsCreateManyInput[] = [];
  for (const product of stripeProducts) {
    const price = priceList.find((price) => price?.id === product?.default_price);
    if (!price) {
      console.log(`Skipping Stripe product ${product?.id}: no matching price found`);
      continue;
    }
    formattedData.push({
      name: product.name,
      description: product.description,
      createdAt: product.created,
      active: product.active,
      liveMode: product.livemode,
      productId: product.id,
      priceId: product.default_price ?? "",
      currency: price.currency,
      amount: (price.unit_amount ?? 0) / 100,
      interval: price.recurring?.interval ?? "",
      intervalCount: price.recurring?.interval_count ?? 0,
      type: price.type === "recurring" ? StripeProductType.recurring : StripeProductType.one_time,
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

export async function getSingleStripeInvoice(id: string): Promise<StripeInvoiceData> {
  const invoice = (
    await axios.get<StripeInvoiceData>(`${STRIPE_API}/invoices/${id}`, {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    })
  )?.data;

  return invoice;
}

export async function getSinglePaymentIntent(id: string): Promise<StripePaymentIntentData> {
  const payment_intent = (
    await axios.get<StripePaymentIntentData>(`${STRIPE_API}/payment_intents/${id}`, {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    })
  )?.data;

  return payment_intent;
}

export async function getSingleStripeSubscription(id: string): Promise<StripeSubscriptionData> {
  const subscription = (
    await axios.get<StripeSubscriptionData>(`${STRIPE_API}/subscriptions/${id}`, {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    })
  )?.data;

  return subscription;
}

export async function getAllStripeSubscriptions() {
  const subscriptions = (
    await axios.get<{ data: StripeSubscriptionData[] }>(`${STRIPE_API}/subscriptions`, {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    })
  )?.data?.data;
  const allStripeProducts = await prisma.stripeProducts.findMany();
  return subscriptions
    ?.map((sub) => {
      const product = allStripeProducts?.find((prod) => prod.productId === sub.plan?.product);
      if (!product) {
        console.log(`Skipping Stripe subscription ${sub.id}: no matching local product found`);
        return null;
      }
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
    })
    .filter((sub) => sub !== null);
}

//Cancel Stripe subscription
export async function cancelStripeSubscription(orgId: string) {
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

export async function updateStripeProduct(
  productId: string,
  data: Prisma.StripeProductsUpdateInput,
) {
  return await prisma.stripeProducts.update({
    where: {
      productId,
    },
    data,
  });
}

export async function deleteStripeProduct(productId: string) {
  return await prisma.stripeProducts.delete({
    where: {
      productId,
    },
  });
}
