import { FastifyInstance } from "fastify";
import {
  getShopifyAuthCallbackHandler,
  getShopifyAuthHandler,
  shopifyWebhooksHandler,
  widgetEventHandler,
} from "./shopify.controller.js";
import { shopifyWidgetEventSchema } from "./shopify.schema.js";
import { rateLimit } from "../../../utils/rateLimit.js";
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

  // Taps on the storefront WhatsApp button, sent by `sendBeacon` from any shop's
  // domain. The body is text/plain, so the browser sends no CORS preflight and
  // reads no answer; nothing here is worth a CORS header.
  server.post(
    "/widget/event",
    {
      // Fail-open: counting a tap is never worth an error on a storefront.
      preHandler: [rateLimit({ max: 60, windowSeconds: 60, key: "shopifyWidgetEvent" })],
      schema: { body: shopifyWidgetEventSchema },
    },
    widgetEventHandler,
  );
}
