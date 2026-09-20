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
      config: { permission: "integrations.shopify" },
      schema: {
        params: byShopParamsSchema,
      },
    },
    updateShopifyIntegrationByShopHandler,
  );

  server.delete(
    "/delete-webhooks",
    { config: { permission: "integrations.shopify" } },
    deleteAllWebhookHandler,
  );

  server.get("/products", getProductsHandler);

  server.get("/registered-webhooks", getRegisteredWebhooksHandler);

  server.post(
    "/register-webhooks",
    { config: { permission: "integrations.shopify" } },
    registerWebhookHandler,
  );

  server.post(
    "/webhooks/topic",
    {
      config: { permission: "integrations.shopify" },
      schema: {
        body: registerWebhookbyTopicSchema,
      },
    },
    registerWebhookByTopicHandler,
  );

  server.delete(
    "/webhooks/topic",
    {
      config: { permission: "integrations.shopify" },
      schema: {
        body: registerWebhookbyTopicSchema,
      },
    },
    deleteWebhookByTopicHandler,
  );

  server.delete(
    "/:shop",
    {
      config: { permission: "integrations.shopify" },
      schema: {
        params: byShopParamsSchema,
      },
    },
    deleteIntegrationByShopHandler,
  );
  server.get("/orders/:id/fulfillment-orders", getFulfillmentOrdersHandler);
  server.post("/orders/fulfill", { config: { access: "session" } }, createFulfillmentHandler);
}
