import { FastifyInstance } from "fastify";
import {
  deleteAllWebhookHandler,
  getProductsHandler,
  getShopifyAuthCallbackHandler,
  getShopifyAuthHandler,
  shopifyWebhooksHandler,
} from "./shopify.controller";
import fastifyRawBody from "fastify-raw-body";

export async function shopifyRoutes(server: FastifyInstance) {
  //Is it necessary?
  // server.addHook("preHandler", checkSession);

  // server.addHook("preHandler", checkShopifySession)

  await server.register(fastifyRawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true,
  });

  server.get("/", getShopifyAuthHandler);
  server.get("/auth/callback", getShopifyAuthCallbackHandler);

  server.delete("/delete-webhooks", {}, deleteAllWebhookHandler);

  server.post(
    "/webhooks",
    {
      config: {
        rawBody: true,
      },
    },
    shopifyWebhooksHandler,
  );

  server.get("/products", {}, getProductsHandler);
}
