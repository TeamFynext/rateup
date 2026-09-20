import type { FastifyReply, FastifyRequest, RouteGenericInterface } from "fastify";
import { inScope } from "../../../authz/scope.js";
import { analyticsTeamId } from "../../../utils/analyticsCache.js";

/**
 * The analytics routes take the team as a filter the client names. A team-scoped actor may
 * only name one of their own; "all" and "null" mean the actor's whole scope, which the
 * queries apply themselves.
 */
// Generic so it slots into every analytics route's preHandler list whatever that route's
// querystring type is; it only ever reads `teamId`.
export async function verifyAnalyticsTeamScope<T extends RouteGenericInterface>(
  request: FastifyRequest<T>,
  reply: FastifyReply,
) {
  const params = request.params as { teamId?: string } | undefined;
  const query = request.query as { teamId?: string } | undefined;
  const teamId = analyticsTeamId(params?.teamId ?? query?.teamId);
  if (!teamId) return;
  if (!request.actor || !inScope(request.actor, teamId)) {
    reply.code(403).send({ message: "This team is outside your access.", reason: "scope" });
  }
}
