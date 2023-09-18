import { FastifyReply, FastifyRequest } from "fastify";
import { GetTeamsByOrgInput } from "../team/team.schema";
import {
  getElectionConstituencyTeamsByOrgId,
  getSurveysByConstituency,
} from "./election.service";
import { electionConfig } from "./election.config";
import { GetSurveyByIdParams } from "../survey/survey.schema";
export async function getAllElectionConstituencyTeamByOrgHandler(
  request: FastifyRequest<{
    Params: GetTeamsByOrgInput;
  }>,
  reply: FastifyReply
) {
  try {
    console.log(electionConfig.orgId);
    const teams = await getElectionConstituencyTeamsByOrgId(
      electionConfig.orgId
    );
    if (!teams || teams.length === 0) {
      reply
        .code(404)
        .send({ message: "No Constituencies found at the moment" });
    } else {
      reply.send(teams);
    }
  } catch (e) {
    reply.code(500).send({ message: "Internal server error" });
  }
}

export async function getAllSurveysUnderConstituencyTeamHandler(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
  }>,
  reply: FastifyReply
) {
  try {
    const surveys = await getSurveysByConstituency(request.params.id);
    if (!surveys || surveys.length === 0) {
      reply.code(404).send({ message: "No Surveys found at the moment" });
    } else {
      reply.send(surveys);
    }
  } catch (e) {
    reply.code(500).send({ message: "Internal server error" });
  }
}
