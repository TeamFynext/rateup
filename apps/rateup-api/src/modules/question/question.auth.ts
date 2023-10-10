import { FastifyRequest, FastifyReply } from "fastify";
import { hasAccessToSurvey } from "../../utils/auth";
import { QuestionsRouteParams } from "./question.schema";
import Session from "supertokens-node/recipe/session";

// TODO: fix this
export async function verifySurveyAccess(
  request: FastifyRequest<{
    Params: QuestionsRouteParams;
  }>,
  reply: FastifyReply
) {
  const surveyId = request.params.surveyId;
  const userId = request.userId;

  const hasAccess = await hasAccessToSurvey(surveyId, userId);

  if (!hasAccess) {
    reply.code(403).send({ message: "You don't have access to this survey" });
  }
}
