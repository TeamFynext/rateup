import { buildActor } from "../../authz/actor.js";
import { isPermission } from "../../authz/permissions.js";
import { FastifyRequest, FastifyReply } from "fastify";
import { log } from "../../utils/logger.js";
import { ByOrgIdParams } from "../org/org.schema.js";
import { authenticateApiAccessToken } from "./apiAccessToken.service.js";
import { getOrgById } from "../org/org.services.js";
import { Role } from "../../../generated/prisma/client.js";

/**
 * Why a key was refused. Thrown by `assertApiAccessToken` so a caller can shape the reply
 * in its own error format; `verifyApiAccessTokenHook` catches it and answers in the shape
 * the support-user webhook has always used.
 */
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
 * The check itself. Throws `ApiAuthError` on refusal and stamps `request.user` on success.
 */
export const assertApiAccessToken = async (request: FastifyRequest) => {
  const params = mayCarryOrgId(request.params) ? request.params : {};
  const query = mayCarryOrgId(request.query) ? request.query : {};
  const orgId = params.orgId ? params.orgId : query.orgId;
  if (!orgId) {
    log.warn({ url: request.url }, "No orgId found in request");
    throw new ApiAuthError(404, "org_not_found", "Not found");
  }

  let org;
  try {
    org = await getOrgById(orgId);
  } catch {
    log.warn({ orgId }, "Invalid orgId");
    throw new ApiAuthError(404, "org_not_found", `Org with orgId='${orgId}' not found`);
  }
  if (!org) {
    log.error({ orgId }, "Org not found");
    throw new ApiAuthError(404, "org_not_found", `Org with orgId='${orgId}' not found`);
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

  const grant = await authenticateApiAccessToken(orgId, accessToken);
  if (!grant) {
    log.error({ orgId }, "Invalid access token");
    throw new ApiAuthError(401, "invalid_token", "Invalid access token");
  }

  request.user = { orgId, role: Role.SUPER_ADMIN };
  request.principal = { kind: "apiKey", orgId, scopes: (grant.scopes ?? []).filter(isPermission) };
  request.actor = buildActor(request.principal);
};

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
    if (err instanceof ApiAuthError) {
      // The shape the support-user webhook has always received. The partner API catches
      // ApiAuthError itself and answers in its own envelope instead.
      const message =
        err.status === 404
          ? "Not found"
          : err.status === 400
            ? "Invalid request"
            : "Not authorized";
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
};
