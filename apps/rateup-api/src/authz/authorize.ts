import type { FastifyReply, FastifyRequest } from "fastify";
import Session from "supertokens-node/recipe/session/index.js";
import { log } from "../utils/logger.js";
import { auditLogHook } from "../utils/auditLog.js";
import { getOrgIdAndRole } from "../modules/user/user.service.js";
import { loadActor } from "./actor.js";
import type { Permission } from "./permissions.js";
import { roleKeyToLegacy } from "./roles.js";

/**
 * Root preHandler: runs before every plugin- and route-level hook, so for a session route
 * it performs the session check itself and leaves `request.actor` (and the legacy
 * `request.user`, with the role read from the database rather than the token) for
 * everything downstream. `checkSession` then has nothing left to do.
 *
 * Returns false after replying 401.
 */
export async function attachSessionActor(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<boolean> {
  if (request.actor) return true;
  try {
    const session = await Session.getSession(request, reply);
    const userId = session.getUserId();
    if (!userId) {
      reply.code(401).send({ message: "Not authorized" });
      return false;
    }
    request.userId = userId;
    let { role, orgId, email } = session.getAccessTokenPayload();

    // A first sign-up creates the session before it creates the org; recover the org
    // from the membership the same way checkSession does.
    if (!orgId) {
      const member = await getOrgIdAndRole({ id: userId });
      if (member) {
        orgId = member.orgId;
        role = member.role;
        await session.mergeIntoAccessTokenPayload({ orgId, role });
      }
    }

    const actor = orgId ? await loadActor(userId, orgId) : null;
    if (actor) {
      request.actor = actor;
      role = roleKeyToLegacy(actor.roleKey!);
    }
    request.user = { userId, role, orgId, email };
    await auditLogHook(request, reply);
    return true;
  } catch (err) {
    log.error({ err }, "Error checking session");
    reply.code(401).send({ message: "Not authorized" });
    return false;
  }
}

/** `/api/<module>/...` → `<module>`, the unit AUTHZ_AUDIT_ONLY is expressed in. */
export function routeModule(url: string | undefined): string | undefined {
  return url?.split("/")[2];
}

export function isAuditOnly(url: string | undefined): boolean {
  const modules = process.env.AUTHZ_AUDIT_ONLY;
  if (!modules) return false;
  const module = routeModule(url);
  return (
    module !== undefined &&
    modules
      .split(",")
      .map((m) => m.trim())
      .includes(module)
  );
}

export async function authorize(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const config = request.routeOptions.config;
  const access = config?.access;
  const permission = config?.permission;

  // Undeclared: the route's own legacy guards still apply. Public: nothing to check.
  // Token: the external v1 plugin verifies the key and builds the actor itself.
  // Staff: the staff plugin's hooks have already authenticated (or refused) the request, and
  // a SuperTokens session must never be what admits anyone there.
  if ((!access && !permission) || access === "public" || access === "token" || access === "staff") {
    return;
  }

  if (!(await attachSessionActor(request, reply))) return;
  if (!permission) return;

  const required = Array.isArray(permission) ? permission : [permission];
  const actor = request.actor;
  if (actor && required.some((p: Permission) => actor.can(p))) return;

  const url = request.routeOptions.url;
  if (isAuditOnly(url)) {
    log.warn(
      {
        permission: required,
        roleKey: actor?.roleKey,
        route: `${request.method} ${url}`,
        orgId: request.user?.orgId,
      },
      "authz audit: request would be refused",
    );
    return;
  }

  reply.code(403).send({
    error: "Permissions failed.",
    message: `Action requires ${required.join(" or ")}.`,
    reason: "permission",
    permission: required[0],
  });
}
