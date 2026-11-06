import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger.js";
import { getActiveSurveyStats, getOverallStats, getTeamMemberStats } from "./dashboard.service.js";
import { ByTeamIdParams } from "../team/team.schema.js";

export async function getOverallStatsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { orgId, userId } = request.user;
    const res = await getOverallStats(orgId, userId!);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function getActiveSurveyStatsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { userId } = request.user;
    const res = await getActiveSurveyStats(userId!);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function getTeamMemberStatsHandler(
  request: FastifyRequest<{ Params: ByTeamIdParams }>,
  reply: FastifyReply,
) {
  try {
    const { teamId } = request.params;
    const { orgId } = request.user;
    const res = await getTeamMemberStats(teamId, orgId);
    if (!res) {
      reply.code(404).send({ message: "Team not found" });
      return;
    }
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Something went wrong" });
  }
}
