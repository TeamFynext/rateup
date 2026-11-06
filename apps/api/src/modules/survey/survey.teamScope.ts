import type { FastifyRequest } from "fastify";
import prisma from "../../utils/prisma.js";

/**
 * The teams whose survey data this session may read: the caller's team memberships inside
 * the session's org, narrowed to the actor's team scope.
 *
 * `getTeamIdsByUserId` alone is not enough here: it spans every org the user belongs to,
 * so a member of two orgs would see both orgs' responses from either session.
 */
export async function sessionTeamIds(
  request: Pick<FastifyRequest, "userId" | "user" | "actor">,
): Promise<string[]> {
  const orgId = request.actor?.orgId ?? request.user?.orgId;
  if (!request.userId || !orgId) return [];
  const rows = await prisma.teamMember.findMany({
    where: { userId: request.userId, team: { orgId } },
    select: { teamId: true },
  });
  const teamIds = rows.map(({ teamId }) => teamId);
  const actor = request.actor;
  if (!actor || actor.scope.all) return teamIds;
  return teamIds.filter((teamId) => actor.scope.teamIds.includes(teamId));
}
