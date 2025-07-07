import { FastifyInstance } from "fastify";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";
import {
  changeUserPasswordHandler,
  createGoogleUserHandler,
  getAllUsersHandler,
  getLoggedUserInfoHandler,
  getLoggedUserProfileHandler,
  pauseUserHandler,
  updateProfileHandler,
  updateProfilePhotoHandler,
  updateRecipeNameHandler,
  updateUserActiveStatusHandler,
  updateUserAvailabilityStatusHandler,
  updateUserPrefLanguageHandler,
} from "./user.controller";
import { $UserRef } from "./user.schema";
import { checkRoleHandler } from "../../utils/checkRoleHandler";
import { $Sref } from "../survey/survey.schema";
import { checkSession } from "../../utils/checkSession";

export async function userRoutes(server: FastifyInstance) {
  server.get(
    "/info",
    {
      preHandler: [verifySession()],
    },
    getLoggedUserInfoHandler,
  );

  server.get(
    "/profile",
    {
      preHandler: [verifySession()],
    },
    getLoggedUserProfileHandler,
  );

  server.put(
    "/update-profile",
    {
      preHandler: [verifySession()],
      schema: {
        body: $UserRef("updateProfileSchema"),
      },
    },
    updateProfileHandler,
  );

  server.put(
    "/update-language",
    {
      preHandler: [verifySession()],
      schema: {
        body: $UserRef("updateUserLanguageSchema"),
      },
    },
    updateUserPrefLanguageHandler,
  );

  server.put(
    "/update-profile-photo",
    {
      preHandler: [verifySession()],
      schema: {
        body: $UserRef("updateProfilePhotoSchema"),
      },
    },
    updateProfilePhotoHandler,
  );

  //this route is dedicated for updating the account-active status of user. Currently used for soft deleting the user.
  server.put(
    "/update-active-status/:userId",
    {
      preHandler: [verifySession(), checkRoleHandler(["SUPER_ADMIN"])],
    },
    updateUserActiveStatusHandler,
  );

  server.post(
    "/change-password",
    {
      preHandler: [verifySession()],
      schema: {
        body: $UserRef("changeUserPasswordSchema"),
      },
    },
    changeUserPasswordHandler,
  );

  server.post(
    "/complete-google-signup",
    {
      schema: {
        body: $UserRef("createUserGoogleSchema"),
      },
    },
    createGoogleUserHandler,
  );

  server.get(
    "/all",
    {
      preHandler: [verifySession(), checkRoleHandler(["SUPER_ADMIN"])],
    },
    getAllUsersHandler,
  );

  server.post(
    "/update-recipe",
    {
      preHandler: [verifySession(), checkRoleHandler(["SUPER_ADMIN"])],
    },
    updateRecipeNameHandler,
  );

  server.put(
    "/pause/:id",
    {
      preHandler: [verifySession(), checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        params: $Sref("idParamsSchema"),
        body: $UserRef("pauseUserSchema"),
      },
    },
    pauseUserHandler,
  );

  server.put(
    "/status",
    {
      preHandler: [checkSession],
      schema: {
        body: $UserRef("userStatusSchema"),
      },
    },
    updateUserAvailabilityStatusHandler,
  );
}
