import { FastifyInstance } from "fastify";
import { createResponseHandler } from "./response.controller.js";
import { $Rref } from "./response.schema.js";

export async function responsePublicRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: $Rref("createResponseInputSchema"),
      },
    },
    createResponseHandler,
  );
}
