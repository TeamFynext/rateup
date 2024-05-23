import { FastifyInstance } from "fastify";
import {
  createCheckoutSessionHandler,
  deleteStripeProductsHandler,
  getAllStripeSubscriptionsHandler,
  getSessionStatusHandler,
  getStripeProductsHandler,
  syncStripeProductsHandler,
  updateStripeProductsHandler,
  webHookHandler,
} from "./stripe.controller";
import { $PSref } from "./stripe.schema";

export async function paymentStripeRoutes(server: FastifyInstance) {
  //server.addHook("preHandler", checkSession);

  // server.addContentTypeParser('application/json', { parseAs: 'string' }, function (request, body, done) {
  //   done(null, body);
  // });

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
