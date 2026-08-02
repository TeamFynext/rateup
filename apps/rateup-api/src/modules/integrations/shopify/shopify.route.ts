import { FastifyInstance } from "fastify";
import {
  deleteAllWebhookHandler,
  deleteIntegrationByShopHandler,
  deleteWebhookByTopicHandler,
  getProductsHandler,
  getRegisteredWebhooksHandler,
  registerWebhookByTopicHandler,
  registerWebhookHandler,
  updateShopifyIntegrationByShopHandler,
  getFulfillmentOrdersHandler,
  createFulfillmentHandler,
} from "./shopify.controller.js";
import { byShopParamsSchema, registerWebhookbyTopicSchema } from "./shopify.schema.js";

export async function shopifyRoutes(server: FastifyInstance) {
  server.put(
    "/session/:shop",
    {
      schema: {
        params: byShopParamsSchema,
      },
    },
    updateShopifyIntegrationByShopHandler,
  );

  server.delete("/delete-webhooks", deleteAllWebhookHandler);

  server.get("/products", getProductsHandler);

  server.get("/registered-webhooks", getRegisteredWebhooksHandler);

  server.post("/register-webhooks", registerWebhookHandler);

  server.post(
    "/webhooks/topic",
    {
      schema: {
        body: registerWebhookbyTopicSchema,
      },
    },
    registerWebhookByTopicHandler,
  );

  server.delete(
    "/webhooks/topic",
    {
      schema: {
        body: registerWebhookbyTopicSchema,
      },
    },
    deleteWebhookByTopicHandler,
  );

  server.delete(
    "/:shop",
    {
      schema: {
        params: byShopParamsSchema,
      },
    },
    deleteIntegrationByShopHandler,
  );
  // GET /shopify/test used to run sendShopifySurveyCronAction — a PLATFORM-WIDE
  // cron that iterates every Shopify integration on the platform and messages other
  // organisations' customers on their quota — for any authenticated member, as many
  // times as they liked. Removed; a cron belongs to the scheduler, not to a route.
  // See issues.txt 26.18.
  server.get("/orders/:id/fulfillment-orders", getFulfillmentOrdersHandler);
  server.post("/orders/fulfill", createFulfillmentHandler);
}
