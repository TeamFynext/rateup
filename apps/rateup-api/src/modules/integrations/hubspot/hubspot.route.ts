import type { FastifyInstance } from "fastify";

import { log } from "../../../utils/logger.js";
import { getHubSpotStatus } from "./hubspot.connect.js";

/**
 * Under `/api/integrations/hubspot`, inheriting the integrations module's
 * permissions. Connecting is the shared `/:name/oauth/*` pair; disconnecting is
 * the generic `DELETE /api/integrations/hubspot`, which revokes the grant
 * through the provider's `disconnect`.
 */
export async function hubSpotRoutes(server: FastifyInstance) {
  server.get("/status", async (request, reply) => {
    try {
      return reply.send(await getHubSpotStatus(request.user.orgId));
    } catch (error) {
      log.error({ err: error }, "HubSpot status failed");
      return reply.code(500).send({ error: "Something went wrong" });
    }
  });
}
