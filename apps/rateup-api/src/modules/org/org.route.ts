import { FastifyInstance } from "fastify";
import {
  createOrgHandler,
 
} from "./org.controller";
import { $Sref } from "./org.schema";
export async function orgRoutes(server: FastifyInstance) {
  // create survey
  server.post(
    "/",
    {
      schema: {
        body: $Sref("createOrgRequestSchema"),
        response: {
          201: $Sref("createOrgResponseSchema"),
        },
      },
    },
    createOrgHandler
  );
}