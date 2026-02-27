import { FastifyReply, FastifyRequest } from "fastify";
import {
  getResponsesBySurveyIdHandler,
  getSurveyListHandler,
} from "../../../modules/response/response.controller.js";

export async function getSurveyResponsesExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return getResponsesBySurveyIdHandler(request as any, reply);
}

export async function getSurveyListExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return getSurveyListHandler(request as any, reply);
}
