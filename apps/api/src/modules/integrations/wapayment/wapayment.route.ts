import type { FastifyInstance, FastifyReply } from "fastify";

import { log } from "../../../utils/logger.js";
import { byNameSchema, type ByNameParams } from "../integrations.schema.js";
import { regenerateWaPaymentOauthLink, syncWaPaymentConfigurations } from "./wapayment.service.js";
import { WaPaymentError } from "./wapayment.types.js";

function fail(reply: FastifyReply, error: unknown, what: string) {
  if (error instanceof WaPaymentError) {
    return reply.code(error.statusCode).send({ error: error.message });
  }
  log.error({ err: error }, "WhatsApp payment %s failed", what);
  return reply.code(500).send({ error: "Something went wrong" });
}

/**
 * Registered at the integrations root, so the paths the settings page has
 * always called stay as they were; permissions are the module's.
 */
export async function waPaymentRoutes(server: FastifyInstance) {
  server.get("/wa_payment_configurations", async (request, reply) => {
    try {
      return reply.send(await syncWaPaymentConfigurations(request.user.orgId));
    } catch (error) {
      return fail(reply, error, "sync");
    }
  });

  // A GET that writes, kept from before: it asks for manage like a write.
  server.get<{ Params: ByNameParams }>(
    "/regenerate_wa_payment_config_oauth/:name",
    { config: { permission: "integrations.manage" }, schema: { params: byNameSchema } },
    async (request, reply) => {
      try {
        return reply.send(
          await regenerateWaPaymentOauthLink(request.user.orgId, request.params.name),
        );
      } catch (error) {
        return fail(reply, error, "link regeneration");
      }
    },
  );
}
