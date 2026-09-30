import { FastifyInstance } from "fastify";
import { shopifyPublicRoutes } from "./shopify/shopify.public.route.js";
import { getleadPublicRoutes } from "./external/getlead/getlead.public.route.js";
import { petPoojaWebhookHandler } from "./integrations.controller.js";
import { inboundWebhookRoutes } from "./shared/inboundWebhook.js";
import { wooCommercePublicRoutes } from "./woocommerce/woocommerce.route.js";
import { hubSpotPublicRoutes } from "./hubspot/hubspot.route.js";

export async function integrationPublicRoutes(server: FastifyInstance) {
  server.register(shopifyPublicRoutes, { prefix: "/shopify" });

  // GetLead calls us from a workflow action, so this cannot sit behind a
  // session. Authenticated by the token in the path and an HMAC over the body.
  server.register(getleadPublicRoutes, { prefix: "/getlead" });

  server.post("/petpooja", petPoojaWebhookHandler);

  // The shared receiver for every provider built on the registry.
  server.register(inboundWebhookRoutes, { prefix: "/webhooks" });

  // WooCommerce POSTs the key it issued here, server to server; see woocommerce.connect.ts.
  server.register(wooCommercePublicRoutes, { prefix: "/woocommerce" });

  // HubSpot's app webhooks: one address for every connected account, signed (v3).
  server.register(hubSpotPublicRoutes, { prefix: "/hubspot" });
}
