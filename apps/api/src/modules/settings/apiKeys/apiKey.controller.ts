import { FastifyReply } from "fastify";
import { FastifyRequest } from "fastify/types/request.js";
import {
  ApiKeyAlreadyExistsError,
  ApiKeyLimitError,
  ApiKeyNotFoundError,
  ApiKeyNotRotatableError,
  ApiKeyScopesRequiredError,
  type ApiKeyScopeGuard,
  createApiKey,
  createApiKeyForOrg,
  deleteApiKey,
  getApiKeyCreatedAt,
  getApiKeyScopes,
  listApiKeys,
  regenerateApiKey,
  revokeApiKey,
  rotateApiKey,
  setApiKeyScopes,
  updateApiKey,
} from "./apiKey.service.js";
import { getApiUsage, listApiRequests } from "./apiUsage.js";
import { featuresForScopes, permissionsForFeatures } from "../../../authz/apiKeyFeatures.js";
import { ForbiddenError } from "../../../authz/errors.js";
import { assertCanGrantKeyScopes } from "../../../authz/grant.js";
import type {
  ApiRequestsQuery,
  ApiUsageQuery,
  CreateApiKeyBody,
  KeyIdParams,
  RotateApiKeyBody,
  UpdateApiKeyBody,
} from "./apiKey.route.js";

/** Shapes a known refusal; anything else escapes to the root error handler. */
function refuse(rep: FastifyReply, error: unknown): boolean {
  if (error instanceof ApiKeyNotFoundError) {
    rep.code(404).send({ message: error.message });
    return true;
  }
  if (error instanceof ApiKeyNotRotatableError) {
    rep.code(409).send({ message: error.message });
    return true;
  }
  if (error instanceof ApiKeyScopesRequiredError) {
    rep.code(400).send({ message: error.message });
    return true;
  }
  if (error instanceof ForbiddenError) {
    rep.code(error.statusCode).send(error.toBody());
    return true;
  }
  if (error instanceof ApiKeyLimitError) {
    rep.code(409).send({ message: error.message, error: "Revoke a key you no longer use" });
    return true;
  }
  return false;
}

/**
 * A key is a grant: the member minting, widening or rotating one may hand it only what they
 * hold themselves (src/authz/grant.ts).
 */
function scopeGuard(req: FastifyRequest): ApiKeyScopeGuard {
  return (scopes) => {
    // `authorize` sets the actor on every session route; without one there is nothing to grant from.
    if (!req.actor) {
      throw new ForbiddenError("No actor for this request.", { reason: "permission" });
    }
    assertCanGrantKeyScopes(req.actor, scopes);
  };
}

// ---- keys (plural) ----

/** A key as the console sees it: its stored permissions, plus the features they cover. */
function withFeatures<T extends { scopes: string[] }>(record: T) {
  return { ...record, features: featuresForScopes(record.scopes) };
}

export async function listApiKeysHandler(req: FastifyRequest, rep: FastifyReply) {
  rep.send({ keys: (await listApiKeys(req.user.orgId)).map(withFeatures) });
}

export async function createApiKeyHandler(
  req: FastifyRequest<{ Body: CreateApiKeyBody }>,
  rep: FastifyReply,
) {
  try {
    const { features, ...input } = req.body;
    const scopes = permissionsForFeatures(features);
    scopeGuard(req)(scopes);
    const { key, record } = await createApiKeyForOrg(req.user.orgId, {
      ...input,
      scopes,
      createdById: req.user.userId ?? null,
    });
    // The only time the plaintext leaves the server.
    rep.code(201).send({ apiKey: key, key: withFeatures(record) });
  } catch (error) {
    if (!refuse(rep, error)) throw error;
  }
}

export async function updateApiKeyHandler(
  req: FastifyRequest<{ Params: KeyIdParams; Body: UpdateApiKeyBody }>,
  rep: FastifyReply,
) {
  try {
    const { features, ...input } = req.body;
    const scopes = features !== undefined ? permissionsForFeatures(features) : undefined;
    // `[]` only round-trips a legacy full-access key unchanged (the service refuses widening).
    if (scopes !== undefined && scopes.length > 0) scopeGuard(req)(scopes);
    const record = await updateApiKey(req.user.orgId, req.params.keyId, {
      ...input,
      ...(scopes !== undefined ? { scopes } : {}),
    });
    rep.send({ key: withFeatures(record) });
  } catch (error) {
    if (!refuse(rep, error)) throw error;
  }
}

export async function revokeApiKeyHandler(
  req: FastifyRequest<{ Params: KeyIdParams }>,
  rep: FastifyReply,
) {
  try {
    await revokeApiKey(req.user.orgId, req.params.keyId);
    rep.code(204).send();
  } catch (error) {
    if (!refuse(rep, error)) throw error;
  }
}

export async function rotateApiKeyHandler(
  req: FastifyRequest<{ Params: KeyIdParams; Body: RotateApiKeyBody }>,
  rep: FastifyReply,
) {
  try {
    const { key, record, previousKeyExpiresAt } = await rotateApiKey(
      req.user.orgId,
      req.params.keyId,
      {
        graceHours: req.body.graceHours,
        createdById: req.user.userId ?? null,
        guard: scopeGuard(req),
      },
    );
    rep.send({ apiKey: key, key: withFeatures(record), previousKeyExpiresAt });
  } catch (error) {
    if (!refuse(rep, error)) throw error;
  }
}

export async function getApiUsageHandler(
  req: FastifyRequest<{ Querystring: ApiUsageQuery }>,
  rep: FastifyReply,
) {
  rep.send(await getApiUsage(req.user.orgId, req.query));
}

export async function listApiRequestsHandler(
  req: FastifyRequest<{ Querystring: ApiRequestsQuery }>,
  rep: FastifyReply,
) {
  rep.send(await listApiRequests(req.user.orgId, req.query));
}

// ---- legacy single-key routes ----

export async function createApiAccessTokenHandler(req: FastifyRequest, rep: FastifyReply) {
  const orgId = req.user.orgId;
  try {
    const apiKey = await createApiKey(orgId, scopeGuard(req));
    rep.code(201).send({ apiKey });
  } catch (error) {
    if (refuse(rep, error)) return;
    if (error instanceof ApiKeyAlreadyExistsError) {
      rep.code(409).send({
        message: error.message,
        error: "Use POST /regenerate to replace it",
      });
      return;
    }
    throw error;
  }
}

export async function deleteApiAccessTokenHandler(req: FastifyRequest, rep: FastifyReply) {
  try {
    await deleteApiKey(req.user.orgId);
  } catch (error) {
    if (!refuse(rep, error)) throw error;
    return;
  }
  rep.code(204).send();
}

export async function getApiAccessTokenCreatedAtHandler(req: FastifyRequest, rep: FastifyReply) {
  const orgId = req.user.orgId;
  const [date, scopes] = await Promise.all([getApiKeyCreatedAt(orgId), getApiKeyScopes(orgId)]);
  // An empty scope list means the key holds every permission (see authz/principal.ts).
  rep.send({ exists: Boolean(date), createdAt: date ?? null, scopes: scopes ?? [] });
}

export async function updateApiAccessTokenScopesHandler(
  req: FastifyRequest<{ Body: { scopes: string[] } }>,
  rep: FastifyReply,
) {
  try {
    scopeGuard(req)(req.body.scopes);
    await setApiKeyScopes(req.user.orgId, req.body.scopes);
  } catch (error) {
    if (error instanceof ApiKeyNotFoundError) {
      rep.code(404).send({ message: "This organization has no API key" });
      return;
    }
    if (!refuse(rep, error)) throw error;
    return;
  }
  rep.send({ scopes: req.body.scopes });
}

/** Rotates the newest key; the old one keeps working for the grace period. */
export async function regenerateApiAccessTokenHandler(req: FastifyRequest, rep: FastifyReply) {
  try {
    const apiKey = await regenerateApiKey(req.user.orgId, scopeGuard(req));
    rep.send({ apiKey });
  } catch (error) {
    if (!refuse(rep, error)) throw error;
  }
}
