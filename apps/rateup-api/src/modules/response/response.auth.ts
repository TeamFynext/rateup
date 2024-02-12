import { FastifyRequest, FastifyReply } from "fastify";
import { hasAccessToSurvey } from "../../utils/auth";
import { GetResponsesParams, getResponsesBody } from "./response.schema";
import Session from "supertokens-node/recipe/session";
import { getSurveyIdfromMap } from "../../utils/surveyTeam/mapActions";

export async function verifyAccess(
  request: FastifyRequest<{
    Params: GetResponsesParams;
    Body: getResponsesBody;
  }>,
  reply: FastifyReply,
) {
  const surveyId = request.params.surveyId
    ? request.params.surveyId
    : request.body?.surveyId
      ? request.body.surveyId
      : await getSurveyIdfromMap(request.params.surveyTeamMapId);
  const hasAccess = await hasAccessToSurvey(surveyId, request.userId);

  if (!hasAccess) {
    reply.code(403).send({ message: "You don't have access to this survey" });
  }
}
