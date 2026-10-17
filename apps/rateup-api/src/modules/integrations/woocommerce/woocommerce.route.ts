import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import z from "zod";

import { log } from "../../../utils/logger.js";
import {
  completeWooConnect,
  getWooStatus,
  listWooProducts,
  repairWooWebhooks,
  startWooConnect,
  updateWooSettings,
  WooConnectError,
} from "./woocommerce.connect.js";
import type { WooAuthCallbackBody } from "./woocommerce.types.js";
import { WooStoreUrlError } from "./woocommerce.url.js";
import {
  checkWooPlugin,
  getWooWidget,
  recordWooWidgetTap,
  saveWooWidget,
  WooWidgetError,
  wooWidgetEventSchema,
  type WooWidgetEvent,
} from "./woocommerce.widget.js";
import { shopifyWidgetSchema, type ShopifyWidgetSettings } from "../shopify/shopify.schema.js";
import { rateLimit } from "../../../utils/rateLimit.js";

const connectSchema = z.object({ storeUrl: z.string().min(1).max(500) });
type ConnectBody = z.infer<typeof connectSchema>;

const settingsSchema = z
  .object({
    syncCustomers: z.boolean().optional(),
    checkoutOptIn: z
      .object({ enabled: z.boolean(), label: z.string().trim().min(1).max(200) })
      .strict()
      .optional(),
  })
  .strict();
type SettingsBody = z.infer<typeof settingsSchema>;

const callbackSchema = z.object({
  key_id: z.union([z.number(), z.string()]),
  user_id: z.string().min(1),
  consumer_key: z.string().min(1),
  consumer_secret: z.string().min(1),
  key_permissions: z.string(),
});

function sendError(reply: FastifyReply, error: unknown, what: string) {
  if (error instanceof WooStoreUrlError) return reply.code(400).send({ error: error.message });
  if (error instanceof WooConnectError) {
    return reply.code(error.statusCode).send({ error: error.message });
  }
  if (error instanceof WooWidgetError) {
    return reply.code(error.status).send({ error: error.message });
  }
  log.error({ err: error }, "WooCommerce %s failed", what);
  return reply.code(500).send({ error: "Something went wrong" });
}

/**
 * Under `/api/integrations/woocommerce`, inheriting the integrations module's
 * permissions: reads need `integrations.read`, writes `integrations.manage`.
 * Disconnecting is the generic `DELETE /api/integrations/woocommerce`, which
 * calls the provider's `disconnect` to remove the webhooks.
 */
export async function wooCommerceRoutes(server: FastifyInstance) {
  server.post<{ Body: ConnectBody }>(
    "/connect",
    { schema: { body: connectSchema } },
    async (request: FastifyRequest<{ Body: ConnectBody }>, reply) => {
      try {
        const { orgId, userId } = request.user;
        const url = await startWooConnect(orgId, userId, request.body.storeUrl);
        return reply.send({ url });
      } catch (error) {
        return sendError(reply, error, "connect start");
      }
    },
  );

  server.get("/status", async (request, reply) => {
    try {
      return reply.send(await getWooStatus(request.user.orgId));
    } catch (error) {
      return sendError(reply, error, "status");
    }
  });

  server.put<{ Body: SettingsBody }>(
    "/settings",
    { schema: { body: settingsSchema } },
    async (request, reply) => {
      try {
        return reply.send(await updateWooSettings(request.user.orgId, request.body));
      } catch (error) {
        return sendError(reply, error, "settings");
      }
    },
  );

  server.get<{ Querystring: { search?: string } }>("/products", async (request, reply) => {
    try {
      return reply.send(await listWooProducts(request.user.orgId, request.query.search ?? ""));
    } catch (error) {
      if (error instanceof WooConnectError) return sendError(reply, error, "products");
      log.warn({ err: error }, "WooCommerce product search failed");
      return reply.code(502).send({ error: "The store did not answer." });
    }
  });

  // The storefront WhatsApp button (woocommerce.widget.ts), shown by the RateUp plugin.
  server.get("/widget", async (request, reply) => {
    try {
      return reply.send(await getWooWidget(request.user.orgId));
    } catch (error) {
      return sendError(reply, error, "widget read");
    }
  });

  server.put<{ Body: ShopifyWidgetSettings }>(
    "/widget",
    { schema: { body: shopifyWidgetSchema } },
    async (request, reply) => {
      try {
        return reply.send(await saveWooWidget(request.user.orgId, request.body));
      } catch (error) {
        return sendError(reply, error, "widget save");
      }
    },
  );

  // "Check again" once the merchant has installed the plugin.
  server.post("/plugin/check", async (request, reply) => {
    try {
      return reply.send(await checkWooPlugin(request.user.orgId));
    } catch (error) {
      return sendError(reply, error, "plugin check");
    }
  });

  server.post("/webhooks/repair", async (request, reply) => {
    try {
      return reply.send(await repairWooWebhooks(request.user.orgId));
    } catch (error) {
      if (error instanceof WooConnectError) return sendError(reply, error, "webhook repair");
      // The store answering badly is not our 500; say where it came from.
      log.warn({ err: error }, "WooCommerce webhook repair failed");
      return reply.code(502).send({ error: "The store would not register the webhooks." });
    }
  });
}

/**
 * WooCommerce's server-to-server key delivery, under
 * `/api/public/integrations/woocommerce`. No session — WooCommerce is calling,
 * not the admin — so it is trusted only as far as the signed state it echoes.
 * A non-2xx makes WooCommerce show the admin an error and send them back with
 * `success=0`.
 */
export async function wooCommercePublicRoutes(server: FastifyInstance) {
  server.post<{ Body: WooAuthCallbackBody }>(
    "/auth-callback",
    { schema: { body: callbackSchema } },
    async (request, reply) => {
      try {
        await completeWooConnect(request.body);
        return reply.send({ ok: true });
      } catch (error) {
        return sendError(reply, error, "connect callback");
      }
    },
  );

  // Taps on the plugin's WhatsApp button, sent by `sendBeacon` from the store's
  // domain. The body is text/plain, so the browser sends no CORS preflight and
  // reads no answer; nothing here is worth a CORS header. Answers without a body.
  server.post<{ Body: WooWidgetEvent }>(
    "/widget/event",
    {
      // Fail-open: counting a tap is never worth an error on a storefront.
      preHandler: [rateLimit({ max: 60, windowSeconds: 60, key: "wooWidgetEvent" })],
      schema: { body: wooWidgetEventSchema },
    },
    async (request, reply) => {
      try {
        return reply.code((await recordWooWidgetTap(request.body)) ? 204 : 404).send();
      } catch (error) {
        log.error({ err: error }, "Error recording a WooCommerce widget tap");
        return reply.code(500).send();
      }
    },
  );
}
