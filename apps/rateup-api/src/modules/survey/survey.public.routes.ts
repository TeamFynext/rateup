import { FastifyInstance } from "fastify";
import { $Sref } from "./survey.schema";
import { getSurveyByIdHandler, verifySurveyPasswordHandler } from "./survey.controller";

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
        params: $Sref("getSurveyByIdParamsSchema"),
      },
    },
    verifySurveyPasswordHandler
  );
}
