import { FastifyInstance } from "fastify";
import {
  deleteAllWebhookHandler,
  deleteWebhookByTopicHandler,
  getProductsHandler,
  getRegisteredWebhooksHandler,
  registerWebhookByTopicHandler,
  registerWebhookHandler,
  updateShopifyIntegrationByShopHandler,
} from "./shopify.controller";
import { ShopifyRef } from "./shopify.schema";

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
}
