import { FastifyInstance, FastifyRequest } from "fastify";
import {
  completedSurveyHandler,
  fetchGoogleUrlBySurveyIdHandler,
  getPhoneFromSurveyTeamMapIdHandler,
  getPublicSurveyByIdHandler,
  getPublicSurveyVariablesHandler,
  reviewPageVisitedOnSurveyHandler,
  startedSurveyHandler,
  verifySurveyPasswordHandler,
  visitedSurveyHandler,
} from "./survey.controller.js";
import { verifySurveyMonthlyLimitRestriction } from "./survey.auth.js";
import {
  getSurveyByIdParamsSchema,
  getSurveyPublicResponseSchema,
  idParamsSchema,
  updateSurveyPasswordRequestSchema,
  uuidParamsSchema,
} from "./survey.schema.js";
import { rateLimit } from "../../utils/rateLimit.js";
import { bySurveyTeamMapIdParamsSchema } from "../team/team.schema.js";

export async function surveyPublicRoutes(server: FastifyInstance) {
  server.get(
    "/:id",
    {
      preHandler: [verifySurveyMonthlyLimitRestriction],
      schema: {
        params: getSurveyByIdParamsSchema,
        response: { 200: getSurveyPublicResponseSchema },
      },
    },
    getPublicSurveyByIdHandler,
  );
  server.get("/:id/phone", getPhoneFromSurveyTeamMapIdHandler);

  server.post(
    "/check-password/:id",
    {
      // A survey password is short and guessable; this is what keeps it from being
      // tried at line rate.
      preHandler: [
        rateLimit<FastifyRequest<{ Params: { id: string } }>>({
          max: 20,
          windowSeconds: 15 * 60,
          key: "surveyPassword",
          keyFrom: (request) => `${request.ip || "unknown"}:${request.params.id}`,
        }),
      ],
      schema: {
        params: uuidParamsSchema,
        body: updateSurveyPasswordRequestSchema,
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
    getPublicSurveyVariablesHandler,
  );
}
