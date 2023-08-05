import { FastifyInstance } from "fastify";
import { createResponseHandler } from "./response.controller";
import { $Rref } from "./response.schema";

export async function responsePublicRoutes(server: FastifyInstance) { 
  server.post(
    "/",
    {
      schema: {
        body: $Rref("createResponseInputSchema"),
      }
    },
    createResponseHandler
  )

}