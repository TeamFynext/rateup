import { FastifyReply, FastifyRequest } from "fastify";

import { log } from "../../../utils/logger.js";
import { getResponsesBySurveyId, getSurveyList } from "./surveys.external.service.js";
import type { GetResponsesBySurveyParams } from "./surveys.external.schema.js";

export async function getSurveyResponsesExternalController(
  req: FastifyRequest<{ Params: GetResponsesBySurveyParams }>,
  res: FastifyReply,
) {
  try {
    const { surveyId } = req.params;
    // The route path always carries one; the optional schema is v1's original.
    if (!surveyId) return res.send([]);
    const response = await getResponsesBySurveyId(surveyId, req.user.orgId);
    return res.send(response);
  } catch (error) {
    log.error({ err: error }, "error while geResponsesBySurveyId");
    return res.code(500).send(error);
  }
}

export async function getSurveyListExternalController(req: FastifyRequest, res: FastifyReply) {
  try {
    const response = await getSurveyList(req.user.orgId);
    return res.send(response);
  } catch (error) {
    log.error({ err: error }, "error while getSurveyListHandler");
    return res.code(500).send(error);
  }
}
