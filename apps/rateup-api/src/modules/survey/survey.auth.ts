import { FastifyRequest, FastifyReply } from "fastify";
import { hasAccessToSurvey, hasAccessToTeam } from "../../utils/auth";
import { CreateSurveyInput } from "./survey.schema";
import { GetSurveyByIdParams } from "./survey.schema";

export async function verifySurveyAccess(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
  }>,
  reply: FastifyReply
) {
  const surveyId = request.params.id;
  const userId = request.session.getUserId();
  const hasAccess = await hasAccessToSurvey(surveyId, userId);

  if (!hasAccess) {
    reply.code(403).send({ message: "You don't have access to this survey" });
  }
}

export async function verifySurveyCreateAccess(
  request: FastifyRequest<{
    Body: CreateSurveyInput;
  }>,
  reply: FastifyReply
) {
  const userId = request.session.getUserId();
  const teamId = request.body.teamId;

  if (!(await hasAccessToTeam(teamId, userId))) {
    reply.code(403).send();
    return;
  }
}
