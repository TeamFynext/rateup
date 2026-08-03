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

  const ownerOnly = [checkRoleHandler(["SUPER_ADMIN"])];

  server.post("/", { preHandler: ownerOnly }, createApiAccessTokenHandler);
  server.delete("/", { preHandler: ownerOnly }, deleteApiAccessTokenHandler);
  server.post("/regenerate", { preHandler: ownerOnly }, regenerateApiAccessTokenHandler);
  // The read returns only whether a key exists and when it was minted, never
  // the key, so it stays available to anyone who may see the settings page.
  server.get("/", getApiAccessTokenCreatedAtHandler);
}
