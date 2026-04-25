import { FastifyInstance } from "fastify";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify/index.js";
import {
  auditLogHandler,
  changeUserPasswordHandler,
  createAppleUserHandler,
  createGoogleUserHandler,
  getAllUsersHandler,
  getLoggedUserInfoHandler,
  getLoggedUserProfileHandler,
  pauseUserHandler,
  updateProfileByIdHandler,
  updateProfileHandler,
  updateProfilePhotoHandler,
  updateRecipeNameHandler,
  updateUserActiveStatusHandler,
  updateUserAvailabilityStatusHandler,
  updateUserPrefLanguageHandler,
} from "./user.controller.js";
import {
  updateProfileSchema,
  updateUserLanguageSchema,
  updateProfilePhotoSchema,
  changeUserPasswordSchema,
  createUserGoogleSchema,
  pauseUserSchema,
  userStatusSchema,
} from "./user.schema.js";
import { checkRoleHandler } from "../../utils/checkRoleHandler.js";
import { checkSession } from "../../utils/checkSession.js";
import { idParamsSchema } from "../stats/stats.schema.js";

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
        body: updateProfileSchema,
      },
    },
    updateProfileHandler,
  );
  server.put(
    "/update-profile/:id",
    {
      preHandler: [verifySession()],
      schema: {
        params: idParamsSchema,
        body: updateProfileSchema,
      },
    },
    updateProfileByIdHandler,
  );

  server.put(
    "/update-language",
    {
      preHandler: [verifySession()],
      schema: {
        body: updateUserLanguageSchema,
      },
    },
    updateUserPrefLanguageHandler,
  );

  server.put(
    "/update-profile-photo",
    {
      preHandler: [verifySession()],
      schema: {
        body: updateProfilePhotoSchema,
      },
    },
    updateProfilePhotoHandler,
  );

  //this route is dedicated for updating the account-active status of user. Currently used for soft deleting the user.
  server.put(
    "/update-active-status/:userId",
    {
      preHandler: [checkSession],
    },
    updateUserActiveStatusHandler,
  );

  server.post(
    "/change-password",
    {
      preHandler: [verifySession()],
      schema: {
        body: changeUserPasswordSchema,
      },
    },
    changeUserPasswordHandler,
  );

  server.post(
    "/complete-google-signup",
    {
      schema: {
        body: createUserGoogleSchema,
      },
    },
    createGoogleUserHandler,
  );

  server.post(
    "/complete-apple-signup",
    {
      schema: {
        body: createUserGoogleSchema,
      },
    },
    createAppleUserHandler,
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
        params: idParamsSchema,
        body: pauseUserSchema,
      },
    },
    pauseUserHandler,
  );

  server.put(
    "/status",
    {
      preHandler: [checkSession],
      schema: {
        body: userStatusSchema,
      },
    },
    updateUserAvailabilityStatusHandler,
  );

  server.get(
    "/audit-logs",
    {
      preHandler: [checkSession, checkRoleHandler(["SUPER_ADMIN"])],
    },
    auditLogHandler,
  );
}
