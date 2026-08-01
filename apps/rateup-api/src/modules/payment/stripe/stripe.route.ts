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
import {
  createStripeCheckoutSchema,
  getSessionStatus,
  productIdParamsSchema,
  updateProductSchema,
} from "./stripe.schema.js";

export async function paymentStripeRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    function (request, body, done) {
      if (request.url === "/api/payment/webhook") {
        done(null, body);
      } else {
        // For other routes, parse the body as JSON
        try {
          done(null, JSON.parse(body.toString()));
        } catch (err) {
          done(err instanceof Error ? err : new Error(String(err)), null);
        }
      }
    },
  );

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

  server.get("/products", {}, getStripeProductsHandler);

  server.get("/subscriptions", {}, getAllStripeSubscriptionsHandler);

  server.put(
    "/subscriptions/cancel",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN"])],
    },
    cancelStripeSubscriptionHandler,
  );

  server.post("/sync-products", {}, syncStripeProductsHandler);
  server.put(
    "/product",
    {
      schema: {
        body: updateProductSchema,
      },
    },
    updateStripeProductsHandler,
  );
  server.delete(
    "/product/:productId",
    {
      schema: {
        params: productIdParamsSchema,
      },
    },
    deleteStripeProductsHandler,
  );
}
