import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger.js";
import { getActiveSurveyStats, getOverallStats, getTeamMemberStats } from "./dashboard.service.js";
import { ByTeamIdParams } from "../team/team.schema.js";

/**
 * All three handlers used to answer failures with `reply.code(500).send(e)`. An
 * Error has no enumerable own properties, so that serialised to `{}` — which is
 * the most likely reason 23.1's six-month-old breakage went unnoticed: the
 * dashboard's stats request answered 500 with an empty body. See issues.txt 23.6.
 */
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
    // The session's org, not the path's team id alone: a team another org owns is
    // indistinguishable from one that does not exist. See issues.txt 23.2.
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
