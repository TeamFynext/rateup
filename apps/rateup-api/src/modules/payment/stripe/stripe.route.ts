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
  webHookHandler,
} from "./stripe.controller.js";
import { $PSref } from "./stripe.schema.js";
import { checkSession } from "../../../utils/checkSession.js";
import { checkRoleHandler } from "../../../utils/checkRoleHandler.js";

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
          done(err, null);
        }
      }
    },
  );

  server.post(
    "/create-checkout-session",
    {
      schema: {
        body: $PSref("createStripeCheckoutSchema"),
      },
    },
    createCheckoutSessionHandler,
  );

  server.get(
    "/session-status",
    {
      schema: {
        querystring: $PSref("getSessionStatus"),
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
        body: $PSref("updateProductSchema"),
      },
    },
    updateStripeProductsHandler,
  );
  server.delete(
    "/product/:productId",
    {
      schema: {
        params: $PSref("productIdParamsSchema"),
      },
    },
    deleteStripeProductsHandler,
  );
}
