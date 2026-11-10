import { FastifyReply, FastifyRequest } from "fastify";
import { getTeamsByOrgId } from "../../../modules/settings/teams/team.service.js";

export async function getTeamsExternalController(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.user.orgId;
  const teams = await getTeamsByOrgId({ orgId });
  return reply.send(teams);
}
