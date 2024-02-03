import { FastifyInstance } from "fastify";
import {
  createQuestionHandler,
  deleteQuestionByIdHandler,
  getQuestionByIdHandler,
  getQuestionsBySurveyIdHandler,
  reorderQuestionsHandler,
  replaceQuestionsHandler,
  updateQuestionHandler,
} from "./question.controller";
import { $Qref } from "./question.schema";
import { verifySurveyAccess } from "./question.auth";
import { checkSession } from "../../utils/checkSession";

// Base route: /api/question/:surveyId
export async function questionRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook("preHandler", verifySurveyAccess);

  // Create survey
  server.post(
    "/",
    {
      schema: {
        body: $Qref("createQuestionRequestSchema"),
        params: $Qref("questionsRouteParamsSchema"),
        response: {
          201: $Qref("createQuestionResponseSchema"),
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
        params: $Qref("questionRouteParamsSchema"),
      },
    },
    getQuestionByIdHandler,
  );

  // gets all questions for a survey
  server.get(
    "/",
    {
      schema: {
        params: $Qref("questionsRouteParamsSchema"),
      },
    },
    getQuestionsBySurveyIdHandler,
  );

  // deletes a question by id
  server.delete(
    "/:id",
    {
      schema: {
        params: $Qref("questionRouteParamsSchema"),
      },
    },
    deleteQuestionByIdHandler,
  );

  // updates the order of questions. Accepts an array of question ids
  server.put(
    "/reorder",
    {
      schema: {
        body: $Qref("updateQuestionsOrderRequestSchema"),
        params: $Qref("questionsRouteParamsSchema"),
      },
    },
    reorderQuestionsHandler,
  );

  // updates a question by id
  server.put(
    "/:id",
    {
      schema: {
        params: $Qref("questionRouteParamsSchema"),
        body: $Qref("updateQuestionRequestSchema"),
      },
    },
    updateQuestionHandler,
  );

  server.put("/replace", replaceQuestionsHandler);
}
