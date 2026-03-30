import { FastifyInstance } from "fastify";
import { createResponseHandler } from "./response.controller.js";
import { createResponseInputSchema } from "./response.schema.js";

export async function responsePublicRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: createResponseInputSchema,
      },
    },
    createResponseHandler,
  );
}
