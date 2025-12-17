import { FastifyInstance } from "fastify";
import {
  getShopifyAuthCallbackHandler,
  getShopifyAuthHandler,
  shopifyWebhooksHandler,
} from "./shopify.controller.js";
import fastifyRawBody from "fastify-raw-body";

export async function shopifyPublicRoutes(server: FastifyInstance) {
  await server.register(fastifyRawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true,
  });

  server.get("/auth", getShopifyAuthHandler);

  server.get("/auth/callback", getShopifyAuthCallbackHandler);

  server.post(
    "/webhooks",
    {
      config: {
        rawBody: true,
      },
    },
    shopifyWebhooksHandler,
  );
}
