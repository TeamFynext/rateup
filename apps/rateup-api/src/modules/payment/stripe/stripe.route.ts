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
import { assertRootOrg } from "../../../utils/auth.js";
import {
  createStripeCheckoutSchema,
  getSessionStatus,
  productIdParamsSchema,
  updateProductSchema,
  type productIdParamsInput,
  type updateProductInput,
} from "./stripe.schema.js";
import { declareAccess } from "../../../authz/registry.js";

export async function paymentStripeRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });

  server.post(
    "/create-checkout-session",
    {
      config: { permission: "billing.manage" },
      schema: {
        body: createStripeCheckoutSchema,
      },
    },
    createCheckoutSessionHandler,
  );

  server.get(
    "/session-status",
    {
      config: { permission: "billing.read" },
      schema: {
        querystring: getSessionStatus,
      },
    },
    getSessionStatusHandler,
  );

  server.get("/products", { preHandler: [assertRootOrg] }, getStripeProductsHandler);

  server.get("/subscriptions", { preHandler: [assertRootOrg] }, getAllStripeSubscriptionsHandler);

  server.put(
    "/subscriptions/cancel",
    {
      config: { permission: "billing.manage" },
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
