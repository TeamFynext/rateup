import { FastifyRequest, FastifyReply } from "fastify";
import { surveyInScope } from "../../authz/resourceScope.js";
import { QuestionsRouteParams } from "./question.schema.js";

// TODO: fix this
export async function verifySurveyAccess(
  request: FastifyRequest<{
    Params: QuestionsRouteParams;
  }>,
  reply: FastifyReply,
) {
  const surveyId = request.params.surveyId;

  const hasAccess = request.actor ? await surveyInScope(surveyId, request.actor) : false;

  if (!hasAccess) {
    reply.code(403).send({ message: "You don't have access to this survey" });
  }
}
