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

const connectSchema = z.object({ storeUrl: z.string().min(1).max(500) });
type ConnectBody = z.infer<typeof connectSchema>;

const settingsSchema = z.object({ syncCustomers: z.boolean().optional() }).strict();
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
}
