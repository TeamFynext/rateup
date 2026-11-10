import { FastifyInstance } from "fastify";
import { createResponseHandler } from "./response.controller.js";
import { createPublicResponseInputSchema } from "./response.schema.js";
import { enforceResponseLimit } from "../survey.limits.js";

export async function responsePublicRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      preHandler: [enforceResponseLimit],
      schema: {
        body: createPublicResponseInputSchema,
      },
    },
    createResponseHandler,
  );
}
