import { FastifyReply, FastifyRequest } from "fastify";
import {
  getResponsesBySurveyIdHandler,
  getSurveyListHandler,
} from "../../../modules/response/response.controller.js";

export async function getSurveyResponsesExternalController(
  request: Parameters<typeof getResponsesBySurveyIdHandler>[0],
  reply: FastifyReply,
) {
  return getResponsesBySurveyIdHandler(request, reply);
}

export async function getSurveyListExternalController(
  request: Parameters<typeof getSurveyListHandler>[0],
  reply: FastifyReply,
) {
  return getSurveyListHandler(request, reply);
}
