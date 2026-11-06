import type { FastifyRequest } from "fastify";

import prisma from "../../../utils/prisma.js";
import { ExternalApiError } from "../../shared/errors.js";
import {
  cursorOrderBy,
  cursorWhere,
  decodeCursor,
  toPage,
  type PaginationQuery,
} from "../pagination.js";
import {
  presentSurvey,
  presentSurveyDetail,
  presentSurveyResponse,
  questionTitles,
} from "./presenters.js";
import type { SurveyIdParams, SurveyListQuery } from "./surveys.schema.js";

/**
 * Every read here goes through the survey's own `orgId`. The route this replaced looked
 * responses up by survey id alone, so any valid key could read another org's responses —
 * contact phone numbers included — given a survey id.
 */
async function loadSurvey(orgId: string, surveyId: string) {
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, orgId },
    select: { id: true, title: true, type: true, createdAt: true, questions: true },
  });
  if (!survey) throw new ExternalApiError(404, "survey_not_found", "No such survey");
  return survey;
}

export async function listSurveysHandler(
  request: FastifyRequest<{ Querystring: SurveyListQuery }>,
) {
  const { limit, cursor, type } = request.query;
  const rows = await prisma.survey.findMany({
    where: {
      orgId: request.user.orgId,
      ...(type ? { type } : {}),
      ...cursorWhere(decodeCursor(cursor)),
    },
    select: { id: true, title: true, type: true, createdAt: true },
    orderBy: cursorOrderBy,
    take: limit + 1,
  });
  return toPage(rows, limit, presentSurvey);
}

export async function getSurveyHandler(request: FastifyRequest<{ Params: SurveyIdParams }>) {
  return presentSurveyDetail(await loadSurvey(request.user.orgId, request.params.surveyId));
}

export async function listSurveyResponsesHandler(
  request: FastifyRequest<{ Params: SurveyIdParams; Querystring: PaginationQuery }>,
) {
  const survey = await loadSurvey(request.user.orgId, request.params.surveyId);
  const { limit, cursor } = request.query;
  const rows = await prisma.surveyResponse.findMany({
    where: { surveyTeamMap: { surveyId: survey.id }, ...cursorWhere(decodeCursor(cursor)) },
    select: {
      id: true,
      createdAt: true,
      language: true,
      tag: true,
      responses: true,
      encryptedResponses: true,
      surveyTeamMap: { select: { teamId: true } },
      Contact: { select: { phone: true } },
    },
    orderBy: cursorOrderBy,
    take: limit + 1,
  });
  const titles = questionTitles(survey.questions);
  return toPage(rows, limit, (row) => presentSurveyResponse(row, titles));
}
