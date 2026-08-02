import { FastifyInstance } from "fastify/types/instance.js";
import {
  createApiAccessTokenHandler,
  deleteApiAccessTokenHandler,
  getApiAccessTokenCreatedAtHandler,
  regenerateApiAccessTokenHandler,
} from "./apiAccessToken.controller.js";
import { checkSession } from "../../utils/checkSession.js";
import { checkRoleHandler } from "../../utils/checkRoleHandler.js";

export async function apiAccessTokenRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  // The tree carried checkSession and nothing else, and the hook that consumes
  // the resulting key sets `request.user = { orgId, role: SUPER_ADMIN }` — a
  // constant. So the lowest-privileged member could mint a key and present it
  // to /api/external/v1 as an owner, passing any role check inside those
  // services; the same four routes also let them delete and regenerate the
  // organisation's key, breaking every existing integration at will. The
  // escalation is bounded to their own org, because the hook verifies the key
  // against the orgId in the path, but within that boundary it is complete.
  // See issues.txt 46.2.
  const ownerOnly = [checkRoleHandler(["SUPER_ADMIN"])];

  server.post("/", { preHandler: ownerOnly }, createApiAccessTokenHandler);
  server.delete("/", { preHandler: ownerOnly }, deleteApiAccessTokenHandler);
  server.post("/regenerate", { preHandler: ownerOnly }, regenerateApiAccessTokenHandler);
  // The read returns only whether a key exists and when it was minted, never
  // the key, so it stays available to anyone who may see the settings page.
  server.get("/", getApiAccessTokenCreatedAtHandler);
}
