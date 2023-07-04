import { FastifyInstance } from "fastify";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";
import { createGoogleUserHandler, getLoggedUserInfoHandler } from "./user.controller";
import { $UserRef } from "./user.schema";

export async function userRoutes(server: FastifyInstance) {

  server.get(
    "/info",
    {
      preHandler: [verifySession()],
    },
    getLoggedUserInfoHandler
  );

  server.post(
    "/complete-google-signup",
    {
      schema: {
        body: $UserRef("createUserGoogleSchema"),
      },
    },
    createGoogleUserHandler
  );

}