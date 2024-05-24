import {
  OrderStatus,
  PaymentStatus,
  PrismaClient,
  SubscriptionStatus,
} from "@prisma/client";
import { sendAWSEmail } from "../../../utils/email/sendAWSEmail";
import axios from "axios";

const prisma = new PrismaClient();

export async function createOrder(data, userId) {
  const order = await prisma.order.create({
    data: {
      name: data.planName,
      createdById: userId,
      orgId: data.orgId,
      subscriptionStatus: SubscriptionStatus.none,
      rateupPlanId: data?.rateupPlanId,
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

export async function processOrder(payload) {
  const {
    id,
    amount_total,
    mode,
    subscription,
    payment_method_types,
    metadata,
  } = payload;

  let subscriptionData = await getSingleStripeSubscription(subscription);

  let invoiceData = await getSingleStripeInvoice(
    subscriptionData.latest_invoice,
  );

  const payment = await prisma.payments.create({
    data: {
      payId: invoiceData.payment_intent,
      amount: invoiceData.amount_paid,
      currency: invoiceData.currency.toUpperCase(),
      method: payment_method_types[0] || "",
      description: "Stripe Subscription create",
      customer_email: invoiceData.customer_email || "",
      customer_phone: invoiceData.customer_phone || "",
      rateupOrderId: metadata?.rateupOrderId,
      createdAt: invoiceData.status_transitions.paid_at,
    },
  });

  let updatedOrder = await prisma.order.update({
    where: { checkoutRefId: id },
    data: {
      paymentId: payment.id,
      paymentStatus: PaymentStatus.SUCCESS,
      status: OrderStatus.COMPLETE,
      subscriptionStatus: SubscriptionStatus.active,
      subscriptionId: subscription,
      subscriptionChargeAt: new Date(
        subscriptionData.current_period_end * 1000,
      ),
    },
  });

  return updatedOrder;
}

export async function createPayment(payload) {
  console.log("creating  payment....");
  console.log(payload);

  const {
    payment_intent,
    amount_paid,
    billing_reason,
    currency,
    customer_email,
    customer_name,
    invoice_pdf,
  } = payload?.data?.object;

  if (payment_intent && amount_paid) {
    // const payment = await prisma.payments.create({
    //   data: {
    //     payment_intent,
    //     amount_paid,
    //     billing_reason,
    //     currency,
    //     customer_email,
    //     customer_name,
    //   },
    // });
    // if (payment) {
    //   console.log("sending email....");
    //   const msg = {
    //     to: customer_email, // Change to your recipient
    //     // from: 'hello@rateup.app', // Change to your verified sender
    //     subject: "Payment Received - Rateup.app",
    //     text: `We have received a payment of ${amount_paid}`,
    //     html: createEmailBodyPaymentReceived(
    //       customer_name,
    //       customer_email,
    //       amount_paid,
    //       currency,
    //       invoice_pdf,
    //     ),
    //   };
    //   try {
    //     sendAWSEmail(msg);
    //   } catch (error) {
    //     console.error(error);
    //     throw new Error("Email sending failed. E:" + error);
    //   }
    // }
    // return payment;
  }
  return null;
}

export async function syncStripeProducts() {
  const [stripeProductRes, priceRes] = await Promise.all([
    (
      await axios.get("https://api.stripe.com/v1/products", {
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        },
      })
    )?.data,
    (
      await axios.get("https://api.stripe.com/v1/prices", {
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
    const price = priceList.find(
      (price) => price?.id === product?.default_price,
    );
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
    ? formattedData.filter(
        (product) => !existingProducts.includes(product?.productId),
      )
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
    await axios.get(`https://api.stripe.com/v1/invoices/${id}`, {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    })
  )?.data;

  return invoice;
}

export async function getSingleStripeSubscription(id) {
  const subscription = (
    await axios.get(`https://api.stripe.com/v1/subscriptions/${id}`, {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    })
  )?.data;

  return subscription;
}

export async function getAllStripeSubscriptions() {
  const subscriptions = (
    await axios.get("https://api.stripe.com/v1/subscriptions", {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    })
  )?.data?.data;
  const allStripeProducts = await prisma.stripeProducts.findMany();
  return subscriptions?.map((sub) => {
    const product = allStripeProducts?.find(
      (prod) => prod.productId === sub.plan.product,
    );
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
