import { FastifyReply, FastifyRequest } from "fastify";
import {
  activateSubscription,
  cancelRazorpaySubscription,
  createCheckoutSession,
  createRateUpPlan,
  deletePaymentPlan,
  deleteRateUpPlan,
  getAllOrgOrders,
  getAllPaymentOrders,
  getAllPaymentPlans,
  getAllPaymentSubscriptions,
  getAllRateupPaymentPlans,
  syncPaymentPlans,
  updateOrder,
  updatePaymentPlan,
  updateRateUpPlan,
  updateSubscription,
  updateSubscriptionForTrial,
  verifyPayment,
} from "./payment.service.js";
import {
  CreateCheckoutInput,
  createRateUpPlanInput,
  orgPlanEmailInput,
  paymentPlanDeleteInput,
  rateupPlanParamInput,
  UpdatePlanInput,
  updateRateUpPlanInput,
} from "./payment.schema.js";
import Session from "supertokens-node/recipe/session/index.js";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils.js";
import { log } from "../../utils/logger.js";
import { sendEmailService } from "../email/email.service.js";
// import { html } from "cheerio";
import { createEmailBodyPricingPlanSelected } from "../../utils/email/payments/pricingPlanSelected.js";
import { Order } from "../../../generated/prisma/client.js";
import { notificationQueue } from "../../utils/redisConnection.js";

export async function createCheckoutSessionHandler(
  request: FastifyRequest<{
    Body: CreateCheckoutInput;
  }>,
  reply: FastifyReply,
) {
  const data = request.body;
  let session = await Session.getSession(request, reply);
  const userId = session.getUserId();

  try {
    const checkoutSession = await createCheckoutSession(userId, data);
    reply.code(201).send(checkoutSession);
  } catch (e) {
    console.log(e);
    reply.code(500).send("Failed");
  }
}

export async function verificationHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  interface KnownProperties {
    event?: string;
    payload?: any;
  }

  const webhookSignature = request.headers["x-razorpay-signature"] as string;
  const webhookBody = request.body;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Verify the webhook signature
  const isValidSignature = validateWebhookSignature(
    JSON.stringify(webhookBody),
    webhookSignature,
    webhookSecret,
  );

  if (!isValidSignature) {
    console.log("invalid signature ....");

    reply.code(400).send("Invalid signature");
    return;
  } else {
    console.log("signature validated....");
  }

  let data: KnownProperties = webhookBody;

  if (data?.event === "payment.captured" || data?.event === "payment.failed") {
    console.log(data?.event);
    try {
      const paymentPlans = await verifyPayment(
        data?.payload?.payment?.entity,
        data?.event,
      );
      return reply.code(201).send(paymentPlans);
    } catch (e) {
      console.log(e);
      return reply.code(500).send("Failed");
    }
  }

  if (data?.event === "subscription.charged") {
    console.log(".....................subscription.charged");
    try {
      const paymentPlans = await updateSubscription(data?.payload);
      return reply.code(201).send(paymentPlans);
    } catch (e) {
      console.log(e);
      return reply.code(500).send("Failed");
    }
  }

  if (data?.event === "subscription.activated") {
    try {
      const paymentPlans = await activateSubscription(data?.payload);
      return reply.code(201).send(paymentPlans);
    } catch (e) {
      console.log(e);
      return reply.code(500).send("Failed");
    }
  }

  reply.code(500).send({ success: false });
}

export async function syncPaymentPlansHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const paymentPlans = await syncPaymentPlans();
    reply.code(201).send(paymentPlans);
  } catch (e) {
    console.log(e);
    reply.code(500).send("Failed");
  }
}

export async function getAllPaymentPlansHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const paymentPlans = await getAllPaymentPlans();
    reply.code(201).send(paymentPlans);
  } catch (e) {
    console.log(e);
    reply.code(500).send("Failed");
  }
}

export async function getAllRateupPaymentPlansHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const paymentPlans = await getAllRateupPaymentPlans();
    reply.code(200).send(paymentPlans);
  } catch (error) {
    reply.code(500).send(error);
  }
}
export async function createRateUpPlanHandler(
  request: FastifyRequest<{
    Body: createRateUpPlanInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const newPlan = await createRateUpPlan(request?.body);
    reply.code(newPlan.code).send(newPlan.data);
  } catch (error) {
    console.error(error);
    reply.code(500).send(error);
  }
}

export async function updateRateUpPlanHandler(
  request: FastifyRequest<{
    Body: updateRateUpPlanInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const newPlan = await updateRateUpPlan(request?.body);
    reply.code(newPlan.code).send(newPlan.data);
  } catch (error) {
    console.error(error);
    reply.code(500).send(error);
  }
}
export async function deleteRateUpPlanHandler(
  request: FastifyRequest<{
    Params: rateupPlanParamInput;
  }>,
  reply: FastifyReply,
) {
  try {
    await deleteRateUpPlan(request?.params);
    reply.code(204).send();
  } catch (error) {
    reply.code(500).send(error);
  }
}
export async function updatePaymentPlanHandler(
  request: FastifyRequest<{
    Body: UpdatePlanInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const paymentPlan = await updatePaymentPlan(request.body);
    reply.code(201).send(paymentPlan);
  } catch (error) {
    console.log(error);
    reply.code(500).send("Failed");
  }
}

// Razorpay.....

export async function getAllPaymentSubscriptionHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const subscriptions = await getAllPaymentSubscriptions();
    reply.code(201).send(subscriptions);
  } catch (error) {
    console.log(error);
    reply.code(500).send("Failed");
  }
}

export async function cancelRazorpaySubscriptionHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    let session = await Session.getSession(request, reply);
    const accessTokenPayload = session.getAccessTokenPayload();
    let orgId = accessTokenPayload.orgId;

    await cancelRazorpaySubscription(orgId);
    reply.code(204).send("Success");
  } catch (error) {
    reply.code(500).send(error);
  }
}

export async function getAllOrdersByOrg(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    let session = await Session.getSession(request, reply);
    const accessTokenPayload = session.getAccessTokenPayload();
    let orgId = accessTokenPayload.orgId;

    const orders = await getAllOrgOrders(orgId);
    reply.code(201).send(orders);
  } catch (error) {
    console.log(error);
    reply.code(500).send("Failed");
  }
}

export async function getAllPaymentOrdersHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const allOrders = await getAllPaymentOrders();
    reply.code(201).send(allOrders);
  } catch (error) {
    console.log(error);
    reply.code(500).send("Failed");
  }
}

export async function deletePaymentPlanHandler(
  request: FastifyRequest<{ Body: paymentPlanDeleteInput }>,
  reply: FastifyReply,
) {
  try {
    const { id, planId } = request.body;
    const plan = await deletePaymentPlan(id, planId);
    reply.code(200).send(plan);
  } catch (error) {
    console.error(error);
    reply.code(500).send("Failed");
  }
}

export async function sendEmailPlanSelectionDetailsHandler(
  request: FastifyRequest<{ Body: orgPlanEmailInput }>,
  reply: FastifyReply,
) {
  try {
    const emailParams = {
      to: process.env.ROOT_ORG_MAIL_ID ?? "hello@rateup.app",
      text: "ALERT: User initiated subscription",
      subject: "ALERT: User initiated subscription",
      html: createEmailBodyPricingPlanSelected(request.body),
    };
    await notificationQueue.add("notification", {
      emailData: emailParams,
    });
    reply.code(200).send();
  } catch (e) {
    log.error(e);
    reply.code(500).send("email sending failed");
  }
}

export async function updateSubscriptionOrderHandler(
  request: FastifyRequest<{
    Params: { orderId: string };
    Body: Partial<Order>;
  }>,
  reply: FastifyReply,
) {
  try {
    const order = await updateOrder(request.params.orderId, request.body);
    const { status } = request.body;
    if (status && status === "COMPLETE") {
      await updateSubscriptionForTrial(
        request.user.orgId,
        order.rateupPlanId,
        order.subscriptionId,
        request.userId,
      );
    }
    reply.code(200).send();
  } catch (e) {
    log.error(e);
    reply.code(500).send("Updating order failed");
  }
}
