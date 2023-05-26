import { FastifyRequest, FastifyReply } from "fastify";
import { hasAccessToSurvey } from "../../utils/auth";
import { GetSurveyByIdParams } from "../survey/survey.schema";
import { GetResponsesParams } from "./response.schema";

export async function verifyAccess(
  request: FastifyRequest<{
    Params: GetResponsesParams;
  }>,
  reply: FastifyReply
) {
  const surveyId = request.params.surveyId;
  const userId = request.session.getUserId();
  const hasAccess = await hasAccessToSurvey(surveyId, userId);

  if (!hasAccess) {
    reply.code(403).send({ message: "You don't have access to this survey" });
  }
}