import { FastifyInstance } from "fastify";
import {
  createQuestionHandler,
  deleteQuestionByIdHandler,
  getQuestionByIdHandler,
  getQuestionsBySurveyIdHandler,
  importAllowedEmailIdsHandler,
  reorderQuestionsHandler,
  replaceQuestionsHandler,
  updateQuestionHandler,
} from "./question.controller.js";
import { verifySurveyAccess } from "./question.auth.js";
import { checkSession } from "../../utils/checkSession.js";
import fastifyMultipart from "@fastify/multipart";
import {
  createQuestionRequestSchema,
  createQuestionResponseSchema,
  questionRouteParamsSchema,
  questionsRouteParamsSchema,
  updateQuestionRequestSchema,
  updateQuestionsOrderRequestSchema,
  replaceQuestionsRequestSchema,
  type ReplaceQuestionsInput,
  type QuestionsRouteParams,
} from "./question.schema.js";

// Base route: /api/question/:surveyId
export async function questionRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook("preHandler", verifySurveyAccess);
  server.register(fastifyMultipart, {
    limits: {
      fileSize: 1048576 * 10,
    },
    throwFileSizeLimit: true,
  });

  // Create survey
  server.post(
    "/",
    {
      schema: {
        body: createQuestionRequestSchema,
        params: questionsRouteParamsSchema,
        response: {
          201: createQuestionResponseSchema,
        },
      },
    },
    createQuestionHandler,
  );

  // gets a question by id
  server.get(
    "/:id",
    {
      schema: {
        params: questionRouteParamsSchema,
      },
    },
    getQuestionByIdHandler,
  );

  // gets all questions for a survey
  server.get(
    "/",
    {
      schema: {
        params: questionsRouteParamsSchema,
      },
    },
    getQuestionsBySurveyIdHandler,
  );

  // deletes a question by id
  server.delete(
    "/:id",
    {
      schema: {
        params: questionRouteParamsSchema,
      },
    },
    deleteQuestionByIdHandler,
  );

  // updates the order of questions. Accepts an array of question ids
  server.put(
    "/reorder",
    {
      schema: {
        body: updateQuestionsOrderRequestSchema,
        params: questionsRouteParamsSchema,
      },
    },
    reorderQuestionsHandler,
  );

  // updates a question by id
  server.put(
    "/:id",
    {
      schema: {
        params: questionRouteParamsSchema,
        body: updateQuestionRequestSchema,
      },
    },
    updateQuestionHandler,
  );

  server.put<{ Body: ReplaceQuestionsInput; Params: QuestionsRouteParams }>(
    "/replace",
    {
      schema: {
        params: questionsRouteParamsSchema,
        body: replaceQuestionsRequestSchema,
      },
    },
    replaceQuestionsHandler,
  );

  server.post(
    "/import-emails/:id",
    {
      schema: {
        params: questionRouteParamsSchema,
        consumes: ["multipart/form-data"],
      },
    },
    importAllowedEmailIdsHandler,
  );
}
