import { FastifyReply, FastifyRequest } from "fastify";
import {
  createPayment,
  deleteStripeProduct,
  getAllStripeSubscriptions,
  getStripeProducts,
  syncStripeProducts,
  updateStripeProduct,
} from "./stripe.service";
import { productIdParamsInput, updateProductInput } from "./stripe.schema";
const stripe = require("stripe")(`${process.env.STRIPE_SECRET_KEY}`);

interface SessionRetrieveRequest {
  session_id: string;
}

export async function createCheckoutSessionHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    line_items: [
      {
        // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
        //TODO make dynamic
        price: "price_1PGQRySEU5WPzKjqmpSIcB4N",
        quantity: 1,
      },
    ],
    mode: "subscription",
    return_url: `${process.env.FRONTEND_URL}/payment/return?session_id={CHECKOUT_SESSION_ID}`,
  });

  reply.send({ clientSecret: session.client_secret });
}

export async function getSessionStatusHandler(
  request: FastifyRequest<{ Querystring: SessionRetrieveRequest }>,
  reply: FastifyReply,
) {
  const session = await stripe.checkout.sessions.retrieve(
    request.query.session_id,
  );

  reply.send({
    status: session.status,
    customer_email: session.customer_details.email,
  });
}

export async function webHookHandler(
  request: FastifyRequest<{ Querystring: SessionRetrieveRequest }>,
  reply: FastifyReply,
) {
  const payload = JSON.parse(request?.body?.toString());
  const sig = request.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(request?.body, sig, endpointSecret);
  } catch (err) {
    console.log(" event error");
    return reply.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(event.type);

  // Handle the checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    console.log(event.data.object);

    console.log("calling create payment");

    const payment = createPayment(request?.body);

    // Retrieve the session. If you require line items in the response, you may include them by expanding line_items.
    const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
      event.data.object.id,
      {
        expand: ["line_items"],
      },
    );
    const lineItems = sessionWithLineItems.line_items;

    // Fulfill the purchase...
    //  fulfillOrder(lineItems);
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
