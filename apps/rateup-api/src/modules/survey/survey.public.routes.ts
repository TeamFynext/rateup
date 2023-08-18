import { FastifyInstance } from "fastify";
import { $Sref } from "./survey.schema";
import { completedSurveyHandler, fetchGoogleUrlBySurveyIdHandler, getSurveyByIdHandler, getSurveyBylandingIdhandler, startedSurveyHandler, verifySurveyPasswordHandler, visitedSurveyHandler } from "./survey.controller";

export async function surveyPublicRoutes(server: FastifyInstance) {
  server.get(
    "/:id",
    {
      schema: {
        params: $Sref("getSurveyByIdParamsSchema"),
        // add response schema
        response: {
          200: $Sref("getSurveyPublicResponseSchema"),
        }
      },
    },
    getSurveyByIdHandler
  );
  


  server.post(
      "/check-password/:id",
      {
        schema: {
          params: $Sref("idParamsSchema"),
        },
      },
      verifySurveyPasswordHandler
  );

  server.post(
    "/:id/visited",
    {
      schema: {
        params: $Sref("idParamsSchema"),
      },
    },
    visitedSurveyHandler
  );

  server.post(
    "/:id/started",
    {
      schema: {
        params: $Sref("idParamsSchema"),
      },
    },
    startedSurveyHandler
  );

  server.post(
    "/:id/completed",
    {
      schema: {
        params: $Sref("idParamsSchema"),
      },
    },
    completedSurveyHandler
  );

  server.get(
    "/googlelink/:id",
    {
      schema: {
        params: $Sref("idParamsSchema"),
      },
    },
    fetchGoogleUrlBySurveyIdHandler
  );
  }
