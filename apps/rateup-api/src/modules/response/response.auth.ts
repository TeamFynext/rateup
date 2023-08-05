import { FastifyRequest, FastifyReply } from "fastify";
import { hasAccessToSurvey } from "../../utils/auth";
import { GetResponsesParams } from "./response.schema";
import Session from "supertokens-node/recipe/session";

export async function verifyAccess(
  request: FastifyRequest<{
    Params: GetResponsesParams;
  }>,
  reply: FastifyReply
) {
  const surveyId = request.params.surveyId;
  let session = await Session.getSession(request, reply);
  let userId = session.getUserId();
  const hasAccess = await hasAccessToSurvey(surveyId, userId);

  if (!hasAccess) {
    reply.code(403).send({ message: "You don't have access to this survey" });
  }
}