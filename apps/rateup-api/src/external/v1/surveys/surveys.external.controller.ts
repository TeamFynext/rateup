import { FastifyReply, FastifyRequest } from "fastify";

import { getResponsesBySurveyId, getSurveyList } from "./surveys.external.service.js";
import type { GetResponsesBySurveyParams } from "./surveys.external.schema.js";

// Failures escape to the partner error handler, which logs them and answers a fixed
// internal_error: the raw error object used to be sent back as the body.

export async function getSurveyResponsesExternalController(
  req: FastifyRequest<{ Params: GetResponsesBySurveyParams }>,
  res: FastifyReply,
) {
  const { surveyId } = req.params;
  // The route path always carries one; the optional schema is v1's original.
  if (!surveyId) return res.send([]);
  return res.send(await getResponsesBySurveyId(surveyId, req.user.orgId));
}

export async function getSurveyListExternalController(req: FastifyRequest, res: FastifyReply) {
  return res.send(await getSurveyList(req.user.orgId));
}
