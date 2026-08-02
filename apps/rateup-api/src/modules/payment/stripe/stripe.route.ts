import { FastifyInstance } from "fastify";
import {
  cancelStripeSubscriptionHandler,
  createCheckoutSessionHandler,
  deleteStripeProductsHandler,
  getAllStripeSubscriptionsHandler,
  getSessionStatusHandler,
  getStripeProductsHandler,
  syncStripeProductsHandler,
  updateStripeProductsHandler,
} from "./stripe.controller.js";
import { checkSession } from "../../../utils/checkSession.js";
import { checkRoleHandler } from "../../../utils/checkRoleHandler.js";
import { assertRootOrg } from "../../../utils/auth.js";
import {
  createStripeCheckoutSchema,
  getSessionStatus,
  productIdParamsSchema,
  updateProductSchema,
  type productIdParamsInput,
  type updateProductInput,
} from "./stripe.schema.js";

export async function paymentStripeRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  // REMOVED: a content-type parser whose special case was
  // `request.url === "/api/payment/webhook"`. This tree registers eight routes
  // and none of them is /webhook — the real Stripe webhook lives in
  // stripePublicRoutes at /api/public/payment/stripe/webhook, with its own
  // correct parser. So the branch was unreachable and every request to this tree
  // took the else path: read as a string, then JSON.parsed by hand instead of by
  // Fastify's own parser, losing its body-size handling. It also read as though
  // raw-body preservation were configured for a webhook in this tree, which is a
  // trap for whoever adds one. See issues.txt 40.6.

  server.post(
    "/create-checkout-session",
    {
      schema: {
        body: createStripeCheckoutSchema,
      },
    },
    createCheckoutSessionHandler,
  );

  server.get(
    "/session-status",
    {
      schema: {
        querystring: getSessionStatus,
      },
    },
    getSessionStatusHandler,
  );

  // These five touch the PLATFORM's Stripe account — the catalogue every customer
  // buys from, and every subscription on the platform. They carried checkSession
  // and nothing else, while their Razorpay equivalents in the sibling file all
  // carry assertRootOrg: `DELETE /api/payment/stripe/product/prod_x` needed only
  // a product id, and `GET /subscriptions` returned every tenant's customer
  // identifiers, statuses and amounts. See issues.txt 40.2.
  server.get("/products", { preHandler: [assertRootOrg] }, getStripeProductsHandler);

  server.get("/subscriptions", { preHandler: [assertRootOrg] }, getAllStripeSubscriptionsHandler);

  server.put(
    "/subscriptions/cancel",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN"])],
    },
    cancelStripeSubscriptionHandler,
  );

  server.post("/sync-products", { preHandler: [assertRootOrg] }, syncStripeProductsHandler);
  server.put<{ Body: updateProductInput }>(
    "/product",
    {
      preHandler: [assertRootOrg],
      schema: {
        body: updateProductSchema,
      },
    },
    updateStripeProductsHandler,
  );
  server.delete<{ Params: productIdParamsInput }>(
    "/product/:productId",
    {
      preHandler: [assertRootOrg],
      schema: {
        params: productIdParamsSchema,
      },
    },
    deleteStripeProductsHandler,
  );
}
