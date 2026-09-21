import { FastifyInstance } from "fastify/types/instance.js";
import { z } from "zod";
import {
  createApiAccessTokenHandler,
  deleteApiAccessTokenHandler,
  getApiAccessTokenCreatedAtHandler,
  regenerateApiAccessTokenHandler,
  updateApiAccessTokenScopesHandler,
} from "./apiAccessToken.controller.js";
import { declareAccess } from "../../authz/registry.js";
import { PERMISSIONS } from "../../authz/permissions.js";

/** Permission keys the key may exercise; an empty list restores full access. */
export const apiKeyScopesSchema = z.object({ scopes: z.array(z.enum(PERMISSIONS)) });
export type ApiKeyScopesInput = z.infer<typeof apiKeyScopesSchema>;

export async function apiAccessTokenRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });

  server.post(
    "/",
    {
      config: { permission: "api_tokens.manage" },
    },
    createApiAccessTokenHandler,
  );
  server.delete(
    "/",
    {
      config: { permission: "api_tokens.manage" },
    },
    deleteApiAccessTokenHandler,
  );
  server.post(
    "/regenerate",
    {
      config: { permission: "api_tokens.manage" },
    },
    regenerateApiAccessTokenHandler,
  );
  server.put<{ Body: ApiKeyScopesInput }>(
    "/scopes",
    {
      config: { permission: "api_tokens.manage" },
      schema: { body: apiKeyScopesSchema },
    },
    updateApiAccessTokenScopesHandler,
  );
  // The read returns only whether a key exists, when it was minted and its scopes, never
  // the key, so it stays available to anyone who may see the settings page.
  server.get("/", { config: { permission: "api_tokens.read" } }, getApiAccessTokenCreatedAtHandler);
}
