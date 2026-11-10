import { FastifyInstance } from "fastify/types/instance.js";
import { z } from "zod";
import {
  createApiAccessTokenHandler,
  createApiKeyHandler,
  deleteApiAccessTokenHandler,
  getApiAccessTokenCreatedAtHandler,
  getApiUsageHandler,
  listApiKeysHandler,
  listApiRequestsHandler,
  regenerateApiAccessTokenHandler,
  revokeApiKeyHandler,
  rotateApiKeyHandler,
  updateApiAccessTokenScopesHandler,
  updateApiKeyHandler,
} from "./apiKey.controller.js";
import { declareAccess } from "../../../authz/registry.js";
import { PERMISSIONS } from "../../../authz/permissions.js";
import { API_KEY_FEATURE_NAMES } from "../../../authz/apiKeyFeatures.js";

/**
 * Permission keys the key may exercise. At least one: an empty list would mean full access,
 * which only keys minted before scopes existed still have.
 */
export const apiKeyScopesSchema = z.object({ scopes: z.array(z.enum(PERMISSIONS)).min(1) });
export type ApiKeyScopesInput = z.infer<typeof apiKeyScopesSchema>;

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(80),
  /** Feature areas the key may use. A new key always names at least one. */
  features: z.array(z.enum(API_KEY_FEATURE_NAMES)).min(1),
  mode: z.enum(["live", "test"]).default("live"),
  /** Which partner API the key opens. v1 keys are always live; `mode` is ignored for them. */
  version: z.enum(["v1", "v2"]).default("v2"),
  expiresAt: z.coerce.date().nullable().optional(),
});
export type CreateApiKeyBody = z.infer<typeof createApiKeySchema>;

export const updateApiKeySchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    /** `[]` is accepted only for a legacy full-access key, and leaves it as it is. */
    features: z.array(z.enum(API_KEY_FEATURE_NAMES)).optional(),
    expiresAt: z.coerce.date().nullable().optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "Nothing to change");
export type UpdateApiKeyBody = z.infer<typeof updateApiKeySchema>;

export const rotateApiKeySchema = z.object({
  /** How long the old key keeps working. 0 ends it at once. */
  graceHours: z.number().int().min(0).max(168).default(24),
});
export type RotateApiKeyBody = z.infer<typeof rotateApiKeySchema>;

export const keyIdParamsSchema = z.object({ keyId: z.uuid() });
export type KeyIdParams = z.infer<typeof keyIdParamsSchema>;

export const apiUsageQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(14),
  keyId: z.uuid().optional(),
});
export type ApiUsageQuery = z.infer<typeof apiUsageQuerySchema>;

export const apiRequestsQuerySchema = z.object({
  keyId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  /** `nextCursor` from the previous page. */
  cursor: z
    .string()
    .regex(/^\d{1,20}$/)
    .optional(),
});
export type ApiRequestsQuery = z.infer<typeof apiRequestsQuerySchema>;

export async function apiAccessTokenRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });
  const manage = { permission: "api_tokens.manage" } as const;
  const read = { permission: "api_tokens.read" } as const;

  // ---- keys (plural) ----
  // Reads return names, prefixes, scopes and timestamps, never a key or its hash.

  server.get("/keys", { config: read }, listApiKeysHandler);
  server.post<{ Body: CreateApiKeyBody }>(
    "/keys",
    { config: manage, schema: { body: createApiKeySchema } },
    createApiKeyHandler,
  );
  server.patch<{ Params: KeyIdParams; Body: UpdateApiKeyBody }>(
    "/keys/:keyId",
    { config: manage, schema: { params: keyIdParamsSchema, body: updateApiKeySchema } },
    updateApiKeyHandler,
  );
  server.delete<{ Params: KeyIdParams }>(
    "/keys/:keyId",
    { config: manage, schema: { params: keyIdParamsSchema } },
    revokeApiKeyHandler,
  );
  server.post<{ Params: KeyIdParams; Body: RotateApiKeyBody }>(
    "/keys/:keyId/rotate",
    { config: manage, schema: { params: keyIdParamsSchema, body: rotateApiKeySchema } },
    rotateApiKeyHandler,
  );
  server.get<{ Querystring: ApiUsageQuery }>(
    "/usage",
    { config: read, schema: { querystring: apiUsageQuerySchema } },
    getApiUsageHandler,
  );
  server.get<{ Querystring: ApiRequestsQuery }>(
    "/usage/requests",
    { config: read, schema: { querystring: apiRequestsQuerySchema } },
    listApiRequestsHandler,
  );

  // ---- the single-key routes a console built before keys were plural still calls ----
  // Each acts on the org's newest key. Remove once rateup-ui has shipped the keys list.

  server.post("/", { config: manage }, createApiAccessTokenHandler);
  server.delete("/", { config: manage }, deleteApiAccessTokenHandler);
  server.post("/regenerate", { config: manage }, regenerateApiAccessTokenHandler);
  server.put<{ Body: ApiKeyScopesInput }>(
    "/scopes",
    { config: manage, schema: { body: apiKeyScopesSchema } },
    updateApiAccessTokenScopesHandler,
  );
  server.get("/", { config: read }, getApiAccessTokenCreatedAtHandler);
}
