import { FastifyRequest, FastifyReply } from "fastify";
import { hasAccessOfTeamAdmin, hasAccessToTeam } from "../../utils/auth.js";
import { CreateTeamInput, EditTeamInput, IdParamInput, InviteMemberInput } from "./team.schema.js";
import prisma from "../../utils/prisma.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";

export async function verifyTeamAdminAccess(
  request: FastifyRequest<{
    Body: EditTeamInput;
    Params: IdParamInput;
  }>,
  reply: FastifyReply,
) {
  const teamId = request.params.id;
  const userId = request.userId;

  if (!userId) {
    reply.code(403).send({ message: "Unauthorised" });
  }

  const hasAccess = await hasAccessOfTeamAdmin(teamId, userId);

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
    Params?: { teamId?: string };
    Body?: { teamId?: string };
  }>,
  reply: FastifyReply,
) {
  const teamId = request.params.teamId || request.body.teamId;
  if (!teamId) {
    reply.code(400).send({ message: "No teamId found in params or body" });
  }
  const hasAccess = await hasAccessToTeam(teamId, request.userId);
  if (!hasAccess) {
    reply.code(403).send({ message: "You don't have access to this team" });
  }
}

export async function verifyTeamMaxCountRestriction(
  request: FastifyRequest<{
    Body: CreateTeamInput;
  }>,
  reply: FastifyReply,
) {
  const orgId = request.user.orgId;

  const count = await prisma.team.count({
    where: {
      orgId: orgId,
    },
  });

  if (count >= request.subscription.features[SubscriptionFeaturePathName.Team].count.max) {
    reply.code(403).send({
      message: "You have reached the maximum limit of teams",
      displayMessageInClient: true,
    });
  }
}

export async function verifyTeamMemberMaxCountRestriction(
  request: FastifyRequest<{
    Body: InviteMemberInput;
  }>,
  reply: FastifyReply,
) {
  const member = await prisma.teamMember.count({
    where: {
      teamId: request.body.teamId,
    },
  });
  const invitationCount = await prisma.invitation.count({
    where: {
      teamId: request.body.teamId,
    },
  });

  const count = member + invitationCount;

  if (
    count >= request.subscription.features[SubscriptionFeaturePathName.Team].teamMember.count.max
  ) {
    reply.code(403).send({
      message: "You have reached the maximum limit of team-members",
      displayMessageInClient: true,
    });
  }
}
