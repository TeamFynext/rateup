import { FastifyInstance } from "fastify";
import fastifyRawBody from "fastify-raw-body";

import { receiveGetLeadWebhookHandler } from "./getlead.webhook.controller.js";

/**
 * The inbound receiver, mounted outside the session-protected routes.
 *
 * `rawBody` is scoped to this route rather than global: an HMAC has to be taken
 * over the exact bytes that were sent, and a parsed-then-restringified body is
 * not those bytes. The same reason `shopify.public.route.ts` does it.
 */
export async function getleadPublicRoutes(server: FastifyInstance) {
  await server.register(fastifyRawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true,
  });

  server.post<{ Params: { token: string } }>(
    "/hooks/:token",
    { config: { rawBody: true } },
    receiveGetLeadWebhookHandler,
  );
}
