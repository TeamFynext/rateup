import { FastifyRequest, FastifyReply } from "fastify";
import { hasAccessToSurvey } from "../../utils/auth.js";
import { GetResponsesParams, getResponsesBody } from "./response.schema.js";
import { getSurveyIdfromMap } from "../../utils/surveyTeam/mapActions.js";

export async function verifyAccess(
  request: FastifyRequest<{
    Params: GetResponsesParams;
    Body: getResponsesBody;
  }>,
  reply: FastifyReply,
) {
  if (
    request.routeOptions.url === "/api/response/generate" ||
    request.routeOptions.url === "/api/response/download-response"
  )
    return;
  const surveyId = request.params.surveyId
    ? request.params.surveyId
    : await getSurveyIdfromMap(request.params.surveyTeamMapId);
  const hasAccess = await hasAccessToSurvey(surveyId, request.userId);

  if (!hasAccess) {
    reply.code(403).send({ message: "You don't have access to this survey" });
  }
}
