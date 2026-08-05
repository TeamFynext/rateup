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
  server.get("/orders/:id/fulfillment-orders", getFulfillmentOrdersHandler);
  server.post("/orders/fulfill", createFulfillmentHandler);
}
