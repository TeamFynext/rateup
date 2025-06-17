import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger";
import {
  getActiveSurveyStats,
  getOverallStats,
  getTeamMemberStats,
} from "./dashboard.service";
import { ByTeamIdParams } from "../team/team.schema";

export async function getOverallStatsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId, userId } = request.user;
    const res = await getOverallStats(orgId, userId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getActiveSurveyStatsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { userId } = request.user;
    const res = await getActiveSurveyStats(userId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getTeamMemberStatsHandler(
  request: FastifyRequest<{ Params: ByTeamIdParams }>,
  reply: FastifyReply,
) {
  try {
    const { teamId } = request.params;
    const res = await getTeamMemberStats(teamId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
