import { FastifyInstance } from "fastify";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";
import { changeUserPasswordHandler, createGoogleUserHandler, getLoggedUserInfoHandler, getLoggedUserProfileHandler, updateProfileHandler, updateProfilePhotoHandler } from "./user.controller";
import { $UserRef } from "./user.schema";

export async function userRoutes(server: FastifyInstance) {

  server.get(
    "/info",
    {
      preHandler: [verifySession()],
    },
    getLoggedUserInfoHandler
  );

  server.get(
    "/profile",
    {
      preHandler: [verifySession()],
    },
    getLoggedUserProfileHandler
  );

  server.put(
    "/update-profile",
    {
      preHandler: [verifySession()],
      schema: {
        body: $UserRef("updateProfileSchema"),
      },
    },
    updateProfileHandler
  );

  server.put(
    "/update-profile-photo",
    {
      preHandler: [verifySession()],
      schema: {
        body: $UserRef("updateProfilePhotoSchema"),
      },
    },
    updateProfilePhotoHandler
  );

  server.post(
    "/change-password",
    {
      preHandler: [verifySession()],
      schema: {
        body: $UserRef("changeUserPasswordSchema"),
      },
    },
    changeUserPasswordHandler
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