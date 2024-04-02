import { FastifyInstance } from "fastify";
import { $Sref } from "./survey.schema";
import {
  completedSurveyHandler,
  fetchGoogleUrlBySurveyIdHandler,
  getPublicSurveyByIdHandler,
  startedSurveyHandler,
  verifySurveyPasswordHandler,
  visitedSurveyHandler,
} from "./survey.controller";
import { $Tref } from "../team/team.schema";

export async function surveyPublicRoutes(server: FastifyInstance) {
  server.get(
    "/:id",
    {
      schema: {
        params: $Sref("getSurveyByIdParamsSchema"),
      },
    },
    getPublicSurveyByIdHandler,
  );

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

  server.get(
    "/googlelink/:surveyTeamMapId",
    {
      schema: {
        params: $Tref("bySurveyTeamMapIdParamsSchema"),
      },
    },
    fetchGoogleUrlBySurveyIdHandler,
  );
}
