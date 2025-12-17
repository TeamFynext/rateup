import { FastifyInstance } from "fastify";
import { $Sref } from "./survey.schema.js";
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
import { $Tref } from "../team/team.schema.js";
import { verifySurveyMonthlyLimitRestriction } from "./survey.auth.js";

export async function surveyPublicRoutes(server: FastifyInstance) {
  server.get(
    "/:id",
    {
      preHandler: [verifySurveyMonthlyLimitRestriction],
      schema: {
        params: $Sref("getSurveyByIdParamsSchema"),
      },
    },
    getPublicSurveyByIdHandler,
  );
  server.get("/:id/phone", getPhoneFromSurveyTeamMapIdHandler);

  server.post(
    "/check-password/:id",
    {
      schema: {
        params: $Sref("idParamsSchema"),
      },
    },
    verifySurveyPasswordHandler,
  );

  server.post(
    "/:id/visited",
    {
      schema: {
        params: $Sref("idParamsSchema"),
      },
    },
    visitedSurveyHandler,
  );

  server.post(
    "/:id/started",
    {
      schema: {
        params: $Sref("idParamsSchema"),
      },
    },
    startedSurveyHandler,
  );

  server.post(
    "/:id/completed",
    {
      schema: {
        params: $Sref("idParamsSchema"),
      },
    },
    completedSurveyHandler,
  );

  server.post(
    "/:id/review/visited",
    {
      schema: {
        params: $Sref("idParamsSchema"),
      },
    },
    reviewPageVisitedOnSurveyHandler,
  );

  server.get(
    "/googlelink/:surveyTeamMapId",
    {
      schema: {
        params: $Tref("bySurveyTeamMapIdParamsSchema"),
      },
    },
    fetchGoogleUrlBySurveyIdHandler,
  );

  server.get(
    "/survey-variables/:id",
    {
      schema: {
        params: $Sref("idParamsSchema"),
      },
    },
    getSurveyVariablesHandler,
  );
}
