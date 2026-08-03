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
