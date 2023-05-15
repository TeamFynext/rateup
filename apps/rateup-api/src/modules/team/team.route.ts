import { FastifyInstance } from "fastify";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";
import {
  createTeamHandler,
} from "./team.controller";
import { $Tref } from "./team.schema";
export async function teamRoutes(server: FastifyInstance) {
  // create team
  server.post(
    "/",
    {
      preHandler: verifySession(),
      schema: {
        body: $Tref("createTeamRequestSchema"),
        response: {
          201: $Tref("createTeamResponseSchema"),
        },
      },
    },
    createTeamHandler
  );

  server.get("/", async () => {
    return { message: "Teams API working fine!" };
  });
}