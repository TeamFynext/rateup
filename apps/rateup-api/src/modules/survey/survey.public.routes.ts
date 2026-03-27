import { FastifyInstance } from "fastify";
import {
  completedSurveyHandler,
  fetchGoogleUrlBySurveyIdHandler,
  getPhoneFromSurveyTeamMapIdHandler,
  getPublicSurveyByIdHandler,
  getSurveyVariablesHandler,
  reviewPageVisitedOnSurveyHandler,
  startedSurveyHandler,
  verifySurveyPasswordHandler,
  visitedSurveyHandler,
} from "./survey.controller.js";
import { verifySurveyMonthlyLimitRestriction } from "./survey.auth.js";
import { getSurveyByIdParamsSchema, idParamsSchema } from "./survey.schema.js";
import { bySurveyTeamMapIdParamsSchema } from "../team/team.schema.js";

export async function surveyPublicRoutes(server: FastifyInstance) {
  server.get(
    "/:id",
    {
      preHandler: [verifySurveyMonthlyLimitRestriction],
      schema: {
        params: getSurveyByIdParamsSchema,
      },
    },
    getPublicSurveyByIdHandler,
  );
  server.get("/:id/phone", getPhoneFromSurveyTeamMapIdHandler);

  server.post(
    "/check-password/:id",
    {
      schema: {
        params: getSurveyByIdParamsSchema,
      },
    },
    verifySurveyPasswordHandler,
  );

  server.post(
    "/:id/visited",
    {
      schema: {
        params: getSurveyByIdParamsSchema,
      },
    },
    visitedSurveyHandler,
  );

  server.post(
    "/:id/started",
    {
      schema: {
        params: idParamsSchema,
      },
    },
    startedSurveyHandler,
  );

  server.post(
    "/:id/completed",
    {
      schema: {
        params: idParamsSchema,
      },
    },
    completedSurveyHandler,
  );

  server.post(
    "/:id/review/visited",
    {
      schema: {
        params: idParamsSchema,
      },
    },
    reviewPageVisitedOnSurveyHandler,
  );

  server.get(
    "/googlelink/:surveyTeamMapId",
    {
      schema: {
        params: bySurveyTeamMapIdParamsSchema,
      },
    },
    fetchGoogleUrlBySurveyIdHandler,
  );

  server.get(
    "/survey-variables/:id",
    {
      schema: {
        params: idParamsSchema,
      },
    },
    getSurveyVariablesHandler,
  );
}
