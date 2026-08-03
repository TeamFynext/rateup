import { FastifyRequest, FastifyReply } from "fastify";
import { hasAccessToSurvey } from "../../utils/auth.js";
import { GetResponsesParams, getResponsesBody } from "./response.schema.js";
import { getSurveyIdfromMap } from "../../utils/surveyTeam/mapActions.js";

export async function verifyAccess(
  request: FastifyRequest<{
    Params: GetResponsesParams;
    Body: getResponsesBody & { surveyId?: string };
  }>,
  reply: FastifyReply,
) {
  if (request.routeOptions.url === "/api/response/generate") return;

  const surveyId =
    request.params.surveyId ??
    request.body?.surveyId ??
    (request.params.surveyTeamMapId
      ? await getSurveyIdfromMap(request.params.surveyTeamMapId)
      : undefined);

  if (!surveyId) {
    return reply.code(400).send({ message: "No survey named in the request" });
  }

  const hasAccess = await hasAccessToSurvey(surveyId, request.userId);

  if (!hasAccess) {
    reply.code(403).send({ message: "You don't have access to this survey" });
  }
}
