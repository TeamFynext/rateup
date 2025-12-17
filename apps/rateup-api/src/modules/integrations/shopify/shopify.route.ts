import { FastifyInstance } from "fastify";
import {
  deleteAllWebhookHandler,
  deleteIntegrationByShopHandler,
  deleteWebhookByTopicHandler,
  getProductsHandler,
  getRegisteredWebhooksHandler,
  registerWebhookByTopicHandler,
  registerWebhookHandler,
  testShopifyCronActionFnHandler,
  updateShopifyIntegrationByShopHandler,
} from "./shopify.controller.js";
import { ShopifyRef } from "./shopify.schema.js";

export async function shopifyRoutes(server: FastifyInstance) {
  server.put(
    "/session/:shop",
    {
      schema: {
        params: ShopifyRef("byShopParamsSchema"),
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
        body: ShopifyRef("registerWebhookbyTopicSchema"),
      },
    },
    registerWebhookByTopicHandler,
  );

  server.delete(
    "/webhooks/topic",
    {
      schema: {
        body: ShopifyRef("registerWebhookbyTopicSchema"),
      },
    },
    deleteWebhookByTopicHandler,
  );

  server.delete(
    "/:shop",
    {
      schema: {
        params: ShopifyRef("byShopParamsSchema"),
      },
    },
    deleteIntegrationByShopHandler,
  );
  server.get("/test", testShopifyCronActionFnHandler);
}
