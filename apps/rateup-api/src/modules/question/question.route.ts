import { FastifyInstance } from "fastify";
import {
  createQuestionHandler,
  deleteQuestionByIdHandler,
  getQuestionByIdHandler,
  getQuestionBySurveyIdHandler,
} from "./question.controller";
import { $Qref } from "./question.schema";

export async function questionRoutes(server: FastifyInstance) {
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
}
