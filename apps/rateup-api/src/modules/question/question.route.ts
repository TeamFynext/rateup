import { FastifyInstance } from "fastify";
import {
  createQuestionHandler,
  deleteQuestionByIdHandler,
  getQuestionByIdHandler,
  getQuestionBySurveyIdHandler,
  reorderQuestionsHandler,
  updateQuestionHandler,
} from "./question.controller";
import { $Qref } from "./question.schema";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";

export async function questionRoutes(server: FastifyInstance) {
  server.addHook("preHandler", verifySession());
  server.post(
    "/",
    {
      schema: {
        body: $Qref("createQuestionRequestSchema"),
        response: {
          201: $Qref("createQuestionResponseSchema"),
        },
      },
    },
    createQuestionHandler
  );

  server.get(
    "/:id",
    {
      schema: {
        params: $Qref("questionIdParamsSchema"),
      },
    },
    getQuestionByIdHandler
  );

  server.get(
    "/all/:id",
    {
      schema: {
        params: $Qref("questionIdParamsSchema"),
      },
    },
    getQuestionBySurveyIdHandler
  );
  server.delete(
    "/:id",
    {
      schema: {
        params: $Qref("questionIdParamsSchema"),
      },
    },
    deleteQuestionByIdHandler
  );

  server.put(
    "/reorder/:surveyId",
    {
      schema: {
        body: $Qref("updateQuestionsOrderRequestSchema"),
      }
    },
    reorderQuestionsHandler
  )

  server.put(
    "/:id",
    {
      schema: {
        params: $Qref("questionIdParamsSchema"),
        body: $Qref("updateQuestionRequestSchema"),
      }
    },
    updateQuestionHandler
  )
}
