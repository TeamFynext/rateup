import { FastifyInstance } from "fastify";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";
import { getLoggedUserInfoHandler } from "./user.controller";

export async function userRoutes(server: FastifyInstance) {

    server.get(
    "/info",
    {
      preHandler: [verifySession()],
    },
    getLoggedUserInfoHandler
  );

}