import { FastifyRequest, FastifyReply } from "fastify";
import {
  bySurveyIdSchema,
  bySurveyThemeIdSchema,
  surveyThemeSchemaCore,
} from "./surveyTheme.schema";
import {
  getSurveyThemeById,
  getSurveyThemeBySurveyId,
  updateSurveyTheme,
} from "./surveyTheme.service";
import { log } from "../../utils/logger";

export async function getSurveyThemeBySurveyIdHandler(
  request: FastifyRequest<{ Params: bySurveyIdSchema }>,
  reply: FastifyReply,
) {
  const { surveyId } = request.params;
  const surveyTheme = await getSurveyThemeBySurveyId(surveyId);
  reply.send(surveyTheme);
}

export async function getSurveyThemeByIdHandler(
  request: FastifyRequest<{ Params: bySurveyThemeIdSchema }>,
  reply: FastifyReply,
) {
  const { surveyThemeId } = request.params;
  const surveyTheme = await getSurveyThemeById(surveyThemeId);
  reply.send(surveyTheme);
}

export async function updateSurveyThemeHandler(
  request: FastifyRequest<{
    Params: bySurveyThemeIdSchema;
    Body: surveyThemeSchemaCore;
  }>,
  reply: FastifyReply,
) {
  const { surveyThemeId } = request.params;
  const surveyTheme = await updateSurveyTheme(surveyThemeId, request.body);
  reply.send(surveyTheme);
}

export function errorHandler(
  error: any,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  log.error(error);
  reply.status(500).send({ message: "Something went wrong" });
}
