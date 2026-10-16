import { buildActor } from "../../authz/actor.js";
import { isPermission } from "../../authz/permissions.js";
import { WIDGET_KEY_INVALID, WIDGET_KEY_REFUSED } from "../../authz/apiKeyFeatures.js";
import { FastifyRequest, FastifyReply } from "fastify";
import { log } from "../../utils/logger.js";
import { ByOrgIdParams } from "../org/org.schema.js";
import redis from "../../utils/redisConnection.js";
import { suspensionCacheKey } from "../org/orgSuspension.js";
import {
  authenticateApiAccessToken,
  grantCacheKey,
  hashApiKey,
  type ApiKeyGrant,
  type ApiKeyMode,
  type ApiKeyVersion,
} from "./apiAccessToken.service.js";
import { Role } from "../../../generated/prisma/client.js";

/**
 * Why a key was refused. Thrown by `assertApiAccessToken` so a caller can shape the reply
 * in its own error format; `verifyApiAccessTokenHook` catches it and answers in the shape
 * the support-user webhook has always used.
 */
declare module "fastify" {
  interface FastifyRequest {
    /** The partner API key that authenticated this request. */
    apiKey?: { id: string; mode: ApiKeyMode; version: ApiKeyVersion };
  }
}

export class ApiAuthError extends Error {
  constructor(
    readonly status: number,
    readonly reason: "org_not_found" | "no_token" | "invalid_token",
    message: string,
  ) {
    super(message);
    this.name = "ApiAuthError";
  }
}

/**
 * The check itself. Throws `ApiAuthError` on refusal and stamps `request.user`,
 * `request.principal`, `request.actor` and `request.apiKey` on success.
 *
 * One Redis round trip on the warm path: the key's cached grant and the org's suspension
 * flag are read together. There is no separate org lookup any more — a key belongs to one
 * org, so a key that verifies for the org in the URL proves the org exists, and a deleted
 * org's keys are gone with it. Returns the suspension flag when the cache had it, null when
 * the caller has to ask `isOrgSuspended`.
 */
export const assertApiAccessToken = async (
  request: FastifyRequest,
  /** Refuse keys minted for another API version. Unset: any of the org's keys (support webhook). */
  { version }: { version?: ApiKeyVersion } = {},
): Promise<{ suspended: boolean | null }> => {
  const params = mayCarryOrgId(request.params) ? request.params : {};
  const query = mayCarryOrgId(request.query) ? request.query : {};
  const orgId = params.orgId ? params.orgId : query.orgId;
  if (!orgId) {
    log.warn({ url: request.url }, "No orgId found in request");
    throw new ApiAuthError(404, "org_not_found", "Not found");
  }

  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    log.error({ orgId }, "No bearer token found in headers");
    throw new ApiAuthError(400, "no_token", "No bearer token found in headers");
  }
  const accessToken = authHeader.split("Bearer ")[1];
  if (!accessToken) {
    log.error({ orgId }, "No access token found in headers");
    throw new ApiAuthError(401, "no_token", "No access token found in headers");
  }

  const tokenHash = hashApiKey(accessToken);
  let cachedGrant: string | null = null;
  let cachedSuspension: string | null = null;
  try {
    [cachedGrant, cachedSuspension] = await redis.mget(
      grantCacheKey(tokenHash),
      suspensionCacheKey(orgId),
    );
  } catch (err) {
    log.warn({ err }, "API key cache read failed; verifying against Postgres");
  }

  const grant = await authenticateApiAccessToken(orgId, accessToken, {
    tokenHash,
    cached: cachedGrant,
  });
  if (!grant) {
    log.error({ orgId }, "Invalid access token");
    throw new ApiAuthError(401, "invalid_token", "Invalid access token");
  }
  assertVersion(grant, version);

  stampKey(request, grant);
  return { suspended: cachedSuspension === null ? null : cachedSuspension === "1" };
};

/**
 * Partner API v2: the key alone names the org, so the URL carries none. Only `rk_` keys are
 * looked at — a v1 key cannot be told from noise without the org to search, and v2 never
 * takes the bcrypt path. Suspension is left to the caller, which knows the org only now.
 */
export const assertApiKeyV2 = async (request: FastifyRequest): Promise<ApiKeyGrant> => {
  const authHeader = request.headers.authorization;
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!accessToken) {
    throw new ApiAuthError(
      401,
      "no_token",
      "Send your API key as `Authorization: Bearer rk_live_…`",
    );
  }
  if (!accessToken.startsWith("rk_")) {
    throw new ApiAuthError(
      401,
      "invalid_token",
      "This is a v1 key; it works on /api/external/v1/{orgId}. Create a v2 key in Settings.",
    );
  }
  const grant = await authenticateApiAccessToken(null, accessToken);
  if (!grant) {
    log.warn({ url: request.url }, "Invalid v2 access token");
    throw new ApiAuthError(401, "invalid_token", "Invalid access token");
  }
  assertVersion(grant, "v2");
  stampKey(request, grant);
  return grant;
};

function assertVersion(grant: ApiKeyGrant, version: ApiKeyVersion | undefined) {
  if (!version || grant.version === version) return;
  throw new ApiAuthError(
    401,
    "invalid_token",
    grant.version === "v2"
      ? "This is a v2 key; it works on /api/external/v2"
      : "This is a v1 key; it works on /api/external/v1/{orgId}",
  );
}

function stampKey(request: FastifyRequest, grant: ApiKeyGrant) {
  const orgId = grant.orgId;
  request.orgId = orgId;
  request.user = { orgId, role: Role.SUPER_ADMIN };
  request.principal = { kind: "apiKey", orgId, scopes: grant.scopes.filter(isPermission) };
  // An empty list means "every permission" (keys from before scopes). A key whose stored
  // scopes have all since left the catalogue must not fall into that, so it gets nothing.
  request.actor =
    grant.scopes.length > 0 && request.principal.scopes.length === 0
      ? { ...buildActor(request.principal), permissions: new Set(), can: () => false }
      : buildActor(request.principal);
  request.apiKey = { id: grant.keyId, mode: grant.mode, version: grant.version };
}

/**
 * Verifies that the api-access-key is valid & sets orgId on the request.user object.
 */
/** Narrows an untyped `params`/`query` bag to "might carry an orgId". Used instead of a
 *  concrete route generic because this hook is mounted on routes with unrelated shapes
 *  (e.g. `/contact/:contactId`, which declares no querystring at all). */
function mayCarryOrgId(value: unknown): value is Partial<ByOrgIdParams> {
  return typeof value === "object" && value !== null;
}

export const verifyApiAccessTokenHook = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await assertApiAccessToken(request);
  } catch (err) {
    refuse(err, reply);
  }
};

/** Answers a refused key in the shape the support-user webhook has always received. */
function refuse(err: unknown, reply: FastifyReply) {
  if (err instanceof ApiAuthError) {
    // The partner API catches ApiAuthError itself and answers in its own envelope instead.
    const message =
      err.status === 404 ? "Not found" : err.status === 400 ? "Invalid request" : "Not authorized";
    // A request with no orgId at all has never carried an `error` field — there is
    // nothing to name. Keep that, so the webhook's callers see no change.
    reply
      .code(err.status)
      .send(err.message === "Not found" ? { message } : { message, error: err.message });
    return;
  }
  log.error({ err }, "Error checking session");
  reply.code(401).send({ message: "Not authorized" });
}

/**
 * Resolves the widget's key, which names its own org: the widget sends no org id. Only `rk_`
 * keys can do that — an older key is found only by searching a known org — so those are the
 * only ones the widget takes. Returns null for a missing, older or unknown key.
 */
export async function authenticateWidgetKey(accessToken: string | undefined) {
  if (!accessToken?.startsWith("rk_")) return null;
  return authenticateApiAccessToken(null, accessToken);
}

/**
 * The embedded support widget's REST check (`/api/support/*`): an `rk_` key that is full
 * access or carries the `widget` feature; the key names the org. It ships in the customer's
 * page source, so a key limited to other features must not work here — and a widget-only key
 * opens no partner API route, since it holds no other permission.
 */
export const verifyWidgetTokenHook = async (request: FastifyRequest, reply: FastifyReply) => {
  const header = request.headers.authorization;
  const grant = await authenticateWidgetKey(
    header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined,
  ).catch((err: unknown) => {
    log.error({ err }, "Could not verify the widget token");
    return null;
  });
  if (!grant) {
    reply.code(401).send({ message: "Not authorized", error: WIDGET_KEY_INVALID });
    return;
  }
  stampKey(request, grant);
  if (!request.actor?.can("widget.connect")) {
    log.warn(
      { orgId: request.orgId, keyId: request.apiKey?.id },
      "Widget call with a non-widget key",
    );
    reply.code(403).send({ message: "Forbidden", error: WIDGET_KEY_REFUSED });
  }
};
