import { FastifyReply, FastifyRequest } from "fastify";
import Session from "supertokens-node/recipe/session/index.js";
import {
  cancelStripeSubscription,
  createOrder,
  createStripePayment,
  deleteStripeProduct,
  getAllStripeSubscriptions,
  getStripeProducts,
  handleInvoicePaymentFailed,
  processOrder,
  syncStripeProducts,
  updateOrder,
  updateStripeProduct,
} from "./stripe.service.js";
import {
  productIdParamsInput,
  updateProductInput,
  GetSessionStatusQuery,
  CreateStripeCheckoutInput,
} from "./stripe.schema.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

interface SessionRetrieveRequest {
  session_id: string;
}

export async function createCheckoutSessionHandler(
  request: FastifyRequest<{
    Body: CreateStripeCheckoutInput;
  }>,
  reply: FastifyReply,
) {
  const data = request.body;
  let userSession = await Session.getSession(request, reply);
  const userId = userSession.getUserId();

  let newOrder = await createOrder(data, userId);

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    line_items: [
      {
        // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
        price: data.priceId, //"price_1PIE1ASEU5WPzKjq5wA24XhE",
        quantity: 1,
      },
    ],
    mode: "subscription",
    return_url: `${process.env.FRONTEND_URL}/dashboard/payment/summary?session_id={CHECKOUT_SESSION_ID}`,
    metadata: {
      rateupOrderId: newOrder.id,
    },
    customer_email: data.email,
    subscription_data: {
      metadata: {
        rateupOrderId: newOrder.id,
      },
    },
  });

  const sessionId = session.id;

  try {
    await updateOrder(newOrder.id, data.priceId, sessionId);

    reply.send({ clientSecret: session.client_secret });
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function getSessionStatusHandler(
  request: FastifyRequest<{ Querystring: GetSessionStatusQuery }>,
  reply: FastifyReply,
) {
  const session = await stripe.checkout.sessions.retrieve(
    request.query.session_id,
  );

  reply.send({
    status: session.status,
    payment_status: session.payment_status,
    customer_email: session.customer_details.email,
  });
}

export async function webHookHandler(
  request: FastifyRequest<{ Querystring: SessionRetrieveRequest }>,
  reply: FastifyReply,
) {
  console.log("Stripe Web hoook Action.................");

  const sig = request.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Ensure request.body is a Buffer or string as required by Stripe
    const rawBody =
      typeof request.body === "string" || Buffer.isBuffer(request.body)
        ? request.body
        : Buffer.from(JSON.stringify(request.body));

    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.log(".....Event error");
    console.log(err.message);

    return reply.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("Stripe Event...........", event.type);

  switch (event.type) {
    case "checkout.session.completed":
      await processOrder(event.data.object);
      break;

    case "invoice.paid":
      await createStripePayment(event.data.object);
      break;

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object);
      break;

    //... handle other event types
    default:
      console.log(`Unhandled event type :  ${event.type}`);
  }

  reply.status(200);
}

export async function getStripeProductsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const res = await getStripeProducts();
    reply.code(200).send(res);
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function syncStripeProductsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const res = await syncStripeProducts();
    reply.code(200).send(res);
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function getAllStripeSubscriptionsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const res = await getAllStripeSubscriptions();
    reply.code(200).send(res);
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function cancelStripeSubscriptionHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    let session = await Session.getSession(request, reply);
    const accessTokenPayload = session.getAccessTokenPayload();
    let orgId = accessTokenPayload.orgId;

    await cancelStripeSubscription(orgId);
    reply.code(204).send("Success");
  } catch (error) {
    reply.code(500).send(error);
  }
}

export async function updateStripeProductsHandler(
  request: FastifyRequest<{ Body: updateProductInput }>,
  reply: FastifyReply,
) {
  try {
    const { productId, ...data } = request.body;
    const res = await updateStripeProduct(productId, data);
    reply.code(200).send(res);
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function deleteStripeProductsHandler(
  request: FastifyRequest<{ Params: productIdParamsInput }>,
  reply: FastifyReply,
) {
  try {
    const res = await deleteStripeProduct(request.params.productId);
    reply.code(200).send(res);
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}
