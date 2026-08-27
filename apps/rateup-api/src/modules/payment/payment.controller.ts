import { FastifyReply, FastifyRequest } from "fastify";
import {
  applySubscriptionStatusEvent,
  applySubscriptionUpdate,
  changeSubscriptionPlan,
  cancelRazorpaySubscription,
  createCheckoutSession,
  createConversationAddonOrder,
  createRateUpPlan,
  deletePaymentPlan,
  deleteRateUpPlan,
  getAllOrgOrders,
  getAllPaymentOrders,
  getAllPaymentPlans,
  getAllPaymentSubscriptions,
  getAllRateupPaymentPlans,
  getConversationAddonOffer,
  getOrgInvoices,
  getSubscriptionChangeOptions,
  isSubscriptionStatusEvent,
  RazorpayPaymentWebhookData,
  RazorpaySubscriptionChargedPayload,
  syncPaymentPlans,
  updateOrder,
  updatePaymentPlan,
  updateRateUpPlan,
  updateSubscription,
  verifyPayment,
} from "./payment.service.js";
import {
  CreateCheckoutInput,
  createRateUpPlanInput,
  orgPlanEmailInput,
  paymentPlanDeleteInput,
  rateupPlanParamInput,
  type ChangePlanInput,
  UpdatePlanInput,
  updateRateUpPlanInput,
  type UpdateOrderStatusInput,
} from "./payment.schema.js";
import Session from "supertokens-node/recipe/session/index.js";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils.js";
import { createHash } from "node:crypto";
import { log } from "../../utils/logger.js";
// import { html } from "cheerio";
import { createEmailBodyPricingPlanSelected } from "../../utils/email/payments/pricingPlanSelected.js";
import { notificationQueue } from "../../workers/bullmq/queues/index.js";

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
    // A refused add-on purchase is a rule, not a fault: send the reason back so the
    // billing page can say why rather than showing a generic failure.
    console.log(e);
    reply.code(400).send({ message: e instanceof Error ? e.message : "Failed" });
  }
}

interface RazorpayWebhookBody {
  event?: string;
  payload?: RazorpaySubscriptionChargedPayload & {
    payment?: { entity?: RazorpayPaymentWebhookData };
  };
}

export async function verificationHandler(
  request: FastifyRequest<{ Body: RazorpayWebhookBody }>,
  reply: FastifyReply,
) {
  const webhookSignature = request.headers["x-razorpay-signature"] as string;
  const webhookBody = request.body;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured");
  }

  // Razorpay signs the exact bytes it sent, so the HMAC has to be computed over the raw
  // body. JSON.stringify() of the parsed object reproduces them only by luck — any
  // non-ASCII escape or number formatting difference silently breaks verification.
  const rawBody = (request as FastifyRequest & { rawBody?: string | Buffer }).rawBody;
  if (rawBody === undefined) {
    log.error("No rawBody on the Razorpay webhook request; check the route config");
    return reply.code(500).send("Webhook misconfigured");
  }

  const isValidSignature = validateWebhookSignature(
    rawBody.toString(),
    webhookSignature,
    webhookSecret,
  );

  if (!isValidSignature) {
    // Nearly always a secret mismatch between the dashboard webhook and
    // RAZORPAY_WEBHOOK_SECRET. The fingerprint identifies which secret this process is
    // using without putting it in the logs.
    log.warn(
      {
        event: webhookBody?.event,
        hasSignature: Boolean(webhookSignature),
        bodyBytes: rawBody.length,
        secretFingerprint: createHash("sha256").update(webhookSecret).digest("hex").slice(0, 8),
      },
      "Razorpay webhook signature rejected",
    );

    reply.code(400).send("Invalid signature");
    return;
  }

  const data = webhookBody;

  if (data?.event === "payment.captured" || data?.event === "payment.failed") {
    console.log(data?.event);
    if (!data.payload?.payment?.entity) {
      return reply.code(400).send("Missing payload.payment.entity");
    }
    try {
      const paymentPlans = await verifyPayment(data.payload.payment.entity, data.event);
      return reply.code(201).send(paymentPlans);
    } catch (e) {
      console.log(e);
      return reply.code(500).send("Failed");
    }
  }

  if (data?.event === "subscription.charged") {
    console.log(".....................subscription.charged");
    if (!data.payload) {
      return reply.code(400).send("Missing payload");
    }
    try {
      const paymentPlans = await updateSubscription(data.payload);
      return reply.code(201).send(paymentPlans);
    } catch (e) {
      console.log(e);
      return reply.code(500).send("Failed");
    }
  }

  if (data?.event === "subscription.updated") {
    if (!data.payload) {
      return reply.code(400).send("Missing payload");
    }
    try {
      const updated = await applySubscriptionUpdate(data.payload);
      return reply.code(201).send(updated);
    } catch (e) {
      console.log(e);
      return reply.code(500).send("Failed");
    }
  }

  // activated / authenticated / pending / halted / cancelled / completed all reduce to
  // "record the new state on the order" — see SUBSCRIPTION_STATUS_BY_EVENT. None of them
  // move money or change entitlements; subscription.charged above does that.
  if (isSubscriptionStatusEvent(data?.event)) {
    if (!data.payload) {
      return reply.code(400).send("Missing payload");
    }
    try {
      const updated = await applySubscriptionStatusEvent(data.event, data.payload);
      return reply.code(201).send(updated);
    } catch (e) {
      console.log(e);
      return reply.code(500).send("Failed");
    }
  }

  // The dashboard webhook is subscribed to more events than this handler acts on.
  // Acknowledge the rest with a 200: Razorpay retries any 5xx on a backoff, so
  // answering "unhandled" with an error turns every ignored event into a redelivery
  // loop rather than a no-op.
  log.info({ event: data?.event }, "Razorpay webhook event ignored");
  return reply.code(200).send({ success: true, handled: false });
}

export async function syncPaymentPlansHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const paymentPlans = await syncPaymentPlans();
    reply.code(201).send(paymentPlans);
  } catch (e) {
    console.log(e);
    reply.code(500).send("Failed");
  }
}

export async function getAllPaymentPlansHandler(request: FastifyRequest, reply: FastifyReply) {
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

export async function getAllOrdersByOrg(request: FastifyRequest, reply: FastifyReply) {
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

export async function getSubscriptionChangeOptionsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const session = await Session.getSession(request, reply);
    const orgId = session.getAccessTokenPayload().orgId;

    reply.code(200).send(await getSubscriptionChangeOptions(orgId));
  } catch (error) {
    log.error({ err: error }, "Failed to read subscription change options");
    reply.code(500).send("Failed");
  }
}

export async function changeSubscriptionPlanHandler(
  request: FastifyRequest<{ Body: ChangePlanInput }>,
  reply: FastifyReply,
) {
  try {
    const session = await Session.getSession(request, reply);
    const orgId = session.getAccessTokenPayload().orgId;

    const result = await changeSubscriptionPlan(
      orgId,
      request.body.rateupPlanId,
      request.body.period,
    );
    reply.code(200).send(result);
  } catch (error) {
    log.error({ err: error }, "Failed to change subscription plan");
    reply
      .code(400)
      .send({ message: error instanceof Error ? error.message : "Failed to change plan" });
  }
}

export async function getOrgInvoicesHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const session = await Session.getSession(request, reply);
    const orgId = session.getAccessTokenPayload().orgId;

    const invoices = await getOrgInvoices(orgId);
    reply.code(200).send(invoices);
  } catch (error) {
    log.error({ err: error }, "Failed to load org invoices");
    reply.code(500).send("Failed");
  }
}

export async function getAllPaymentOrdersHandler(request: FastifyRequest, reply: FastifyReply) {
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
      html: await createEmailBodyPricingPlanSelected(request.body),
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
    Body: UpdateOrderStatusInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { status } = request.body;
    const order = await updateOrder(request.params.orderId, status, request.user.orgId);

    // The guard outlives the trial flow it was written for: an unpaid order must not be
    // marked complete, however it got here.
    if (status === "COMPLETE" && order.paymentStatus !== "SUCCESS") {
      return reply.code(409).send({
        message: "This order has not been paid for; its subscription cannot be started",
      });
    }
    reply.code(200).send();
  } catch (e) {
    if (e && typeof e === "object" && (e as { code?: string }).code === "P2025") {
      return reply.code(404).send({ message: "Order not found" });
    }
    log.error(e);
    reply.code(500).send({ message: "Updating order failed" });
  }
}

export async function getConversationAddonOfferHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const session = await Session.getSession(request, reply);
    const orgId = session.getAccessTokenPayload().orgId;

    reply.code(200).send(await getConversationAddonOffer(orgId));
  } catch (error) {
    log.error({ err: error }, "Failed to read the conversation add-on offer");
    reply.code(500).send("Failed");
  }
}

export async function createConversationAddonOrderHandler(
  request: FastifyRequest<{ Body: { quantity?: number } }>,
  reply: FastifyReply,
) {
  try {
    const session = await Session.getSession(request, reply);
    const orgId = session.getAccessTokenPayload().orgId;

    reply
      .code(201)
      .send(
        await createConversationAddonOrder(session.getUserId(), orgId, request.body?.quantity ?? 1),
      );
  } catch (error) {
    // A refused purchase is a rule, not a fault — a Free or Enterprise org needs to hear
    // why rather than a generic failure.
    log.error({ err: error }, "Failed to create a conversation add-on order");
    reply.code(400).send({ message: error instanceof Error ? error.message : "Failed" });
  }
}
