import { FastifyRequest, FastifyReply } from "fastify";
import { inScope } from "../../authz/scope.js";
import { EditTeamInput, IdParamInput } from "./team.schema.js";
import { enforcePlanLimit } from "../subscription/planLimits.js";

export async function verifyTeamAdminAccess(
  request: FastifyRequest<{
    Body: EditTeamInput;
    Params: IdParamInput;
  }>,
  reply: FastifyReply,
) {
  const teamId = request.params.id;
  const actor = request.actor;

  // Managing a team takes the permission and, for a team-scoped role, membership of it.
  const hasAccess = actor ? actor.can("teams.manage_members") && inScope(actor, teamId) : false;

  if (!hasAccess) {
    reply.code(403).send({ message: "You don't have team admin access" });
  }
}

/**
 * Verifies if the user has access to the teamId in params or body
 * @param request
 * @param reply
 */
export async function verifyTeamAccess(
  request: FastifyRequest<{
    // Routes that use this hook carry all sorts of params/body shapes; only the
    // optional `teamId` is read here, so the rest is left open.
    Params?: { teamId?: string } & Record<string, unknown>;
    Body?: { teamId?: string } & Record<string, unknown>;
  }>,
  reply: FastifyReply,
) {
  const teamId = request.params?.teamId || request.body?.teamId;
  if (!teamId) {
    reply.code(400).send({ message: "No teamId found in params or body" });
    return;
  }
  const hasAccess = request.actor ? inScope(request.actor, teamId) : false;
  if (!hasAccess) {
    reply.code(403).send({ message: "You don't have access to this team" });
  }
}

/**
 * The org to meter, or null when the request names one that is not the caller's.
 *
 * Both bodies carry `orgId` from the client while the subscription on the request is the
 * session's, so a request naming another org would be measured against an allowance that
 * is not the one it spends. Every real client sends its own org, so a mismatch is refused
 * rather than reconciled.
 */
function orgToMeter(request: FastifyRequest): string | null {
  const orgId = request.user.orgId;
  const named = (request.body as { orgId?: string } | undefined)?.orgId;
  return named && named !== orgId ? null : orgId;
}

/**
 * Refuses a team the org's plan has no room for.
 *
 * Both of these were stubs — the bodies sat commented out behind a `TODO: re-check`, so
 * every plan's team and user limits were advertised on the pricing page, metered on the
 * dashboard, and enforced nowhere. They are now two rows in PLAN_LIMITS: what counts as
 * unlimited, what the refusal says, and how seats are counted all live there, shared with
 * the service backstop that covers the paths no preHandler runs on.
 */
export const verifyTeamMaxCountRestriction = enforcePlanLimit("teams", {
  org: orgToMeter,
  orgMismatchMessage: "You cannot create a team in another organisation",
});

/** Refuses an invitation the org has no seat for. See above. */
export const verifyTeamMemberMaxCountRestriction = enforcePlanLimit("users", {
  org: orgToMeter,
  orgMismatchMessage: "You cannot invite into another organisation",
});
