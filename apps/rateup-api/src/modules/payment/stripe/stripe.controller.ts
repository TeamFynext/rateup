import { FastifyReply, FastifyRequest } from "fastify";
import Session from "supertokens-node/recipe/session/index.js";
import {
  cancelStripeSubscription,
  createOrder,
  createStripePayment,
  deleteOrder,
  deleteStripeProduct,
  findOrderByCheckoutRef,
  getAllStripeSubscriptions,
  getStripeProducts,
  handleInvoicePaymentFailed,
  processOrder,
  StripeCheckoutSessionPayload,
  StripeInvoiceData,
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
import { log } from "../../../utils/logger.js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}
const stripe = new Stripe(stripeSecretKey);

interface SessionRetrieveRequest {
  session_id: string;
}

// Stripe's SDK types model the Invoice/Checkout Session shape of the *current* Stripe API
// version, but this account's configured webhook API version delivers the older, flatter
// shape this codebase's business logic already expects (e.g. `invoice.subscription` /
// `invoice.payment_intent` as direct string fields, rather than nested under
// `invoice.parent.subscription_details`) - and `Stripe.Event.Data.Object` itself is an
// intentionally-empty stub in the SDK's own types. There's no compile-time type that
// accurately describes this account's real payload shape, so this bridges through
// `unknown` rather than a `Record<string,...>` shape check (which would reject Stripe
// event payloads the SDK's own types don't fully populate, e.g. minimal test fixtures or
// event variants this codebase doesn't otherwise care about). The individual fields each
// service function actually reads are still null-guarded at their point of use in
// stripe.service.ts (see `createStripePayment`, `handleInvoicePaymentFailed`, `processOrder`).
function toStripeCheckoutSessionPayload(value: unknown): StripeCheckoutSessionPayload {
  return value as unknown as StripeCheckoutSessionPayload;
}

function toStripeInvoiceData(value: unknown): StripeInvoiceData {
  return value as unknown as StripeInvoiceData;
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

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page",
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
  } catch (e) {
    log.error({ err: e, orderId: newOrder.id }, "Stripe checkout session could not be created");
    await deleteOrder(newOrder.id).catch((err) =>
      log.error({ err, orderId: newOrder.id }, "Could not clean up the orphaned order"),
    );
    return reply.code(502).send({ message: "The checkout session could not be created" });
  }

  const sessionId = session.id;

  try {
    await updateOrder(newOrder.id, data.priceId, sessionId);

    reply.send({ clientSecret: session.client_secret });
  } catch (e) {
    log.error({ err: e, orderId: newOrder.id }, "Could not record the checkout session");
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function getSessionStatusHandler(
  request: FastifyRequest<{ Querystring: GetSessionStatusQuery }>,
  reply: FastifyReply,
) {
  const order = await findOrderByCheckoutRef(request.query.session_id, request.user.orgId);
  if (!order) {
    return reply.code(404).send({ message: "Checkout session not found" });
  }

  const session = await stripe.checkout.sessions.retrieve(request.query.session_id);

  reply.send({
    status: session.status,
    payment_status: session.payment_status,
    // customer_details was already dereferenced optionally here; an abandoned
    // checkout has none.
    customer_email: session.customer_details?.email ?? null,
  });
}

export async function webHookHandler(
  request: FastifyRequest<{ Querystring: SessionRetrieveRequest }>,
  reply: FastifyReply,
) {
  console.log("Stripe Web hoook Action.................");

  const sig = request.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  let event: Stripe.Event;

  try {
    // Ensure request.body is a Buffer or string as required by Stripe
    const rawBody =
      typeof request.body === "string" || Buffer.isBuffer(request.body)
        ? request.body
        : Buffer.from(JSON.stringify(request.body));

    // A missing signature header (sig === undefined) is passed through as "" rather than
    // short-circuited here - constructEvent() below already rejects a missing/invalid
    // signature and the surrounding try/catch already turns that into a 400, so an early
    // guard here would only duplicate that handling.
    event = stripe.webhooks.constructEvent(rawBody, sig ?? "", endpointSecret);
  } catch (err) {
    console.log(".....Event error");
    const message = err instanceof Error ? err.message : String(err);
    console.log(message);

    return reply.status(400).send(`Webhook Error: ${message}`);
  }

  console.log("Stripe Event...........", event.type);

  switch (event.type) {
    case "checkout.session.completed":
      await processOrder(toStripeCheckoutSessionPayload(event.data.object));
      break;

    case "invoice.paid":
      await createStripePayment(toStripeInvoiceData(event.data.object));
      break;

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(toStripeInvoiceData(event.data.object));
      break;

    //... handle other event types
    default:
      console.log(`Unhandled event type :  ${event.type}`);
  }

  reply.status(200).send();
}

export async function getStripeProductsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const res = await getStripeProducts();
    reply.code(200).send(res);
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function syncStripeProductsHandler(request: FastifyRequest, reply: FastifyReply) {
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
