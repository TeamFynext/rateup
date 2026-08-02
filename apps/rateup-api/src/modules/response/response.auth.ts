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
  // /generate is the only exemption left. It carries assertRootOrg of its own and
  // names no survey to resolve — it CREATES them. /download-response used to be
  // exempt beside it while carrying nothing but checkSession, and its handler
  // takes surveyId straight from the body: that combination exported any
  // organisation's full response set as a spreadsheet. It is checked now, from
  // the body's surveyId. See issues.txt 37.1.
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
