import { FastifyInstance } from "fastify";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify/index.js";
import {
  auditLogHandler,
  auditLogFeaturesHandler,
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
  deleteUserSchema,
  DeleteUserSchema,
  createUserGoogleSchema,
  pauseUserSchema,
  userStatusSchema,
  PauseUserInput,
  UserStatusSchema,
  auditLogQuerySchema,
  type AuditLogQuery,
} from "./user.schema.js";
import { checkSession } from "../../utils/checkSession.js";
import { assertRootOrg } from "../../utils/auth.js";
import { idParamsSchema } from "../stats/stats.schema.js";
import { IdParamInput } from "../survey/survey.schema.js";
import { declareAccess } from "../../authz/registry.js";

export async function userRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });
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
  server.put<{ Params: { userId: string }; Body: DeleteUserSchema }>(
    "/update-active-status/:userId",
    {
      preHandler: [checkSession],
      schema: {
        body: deleteUserSchema,
      },
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
      config: { access: "public" },
      schema: {
        body: createUserGoogleSchema,
      },
    },
    createGoogleUserHandler,
  );

  server.post(
    "/complete-apple-signup",
    {
      config: { access: "public" },
      schema: {
        body: createUserGoogleSchema,
      },
    },
    createAppleUserHandler,
  );

  // Both answer for every user on the platform, not the caller's org, so they are the
  // root org's alone. checkSession rather than verifySession: assertRootOrg reads
  // request.user.orgId, which only checkSession sets.
  server.get(
    "/all",
    {
      config: { permission: "members.manage" },
      preHandler: [checkSession, assertRootOrg],
    },
    getAllUsersHandler,
  );

  server.post(
    "/update-recipe",
    {
      config: { permission: "members.manage" },
      preHandler: [checkSession, assertRootOrg],
    },
    updateRecipeNameHandler,
  );

  server.put<{ Body: PauseUserInput; Params: IdParamInput }>(
    "/pause/:id",
    {
      config: { permission: "members.manage" },
      preHandler: [verifySession()],
      schema: {
        params: idParamsSchema,
        body: pauseUserSchema,
      },
    },
    pauseUserHandler,
  );

  server.put<{ Body: UserStatusSchema }>(
    "/status",
    {
      preHandler: [checkSession],
      schema: {
        body: userStatusSchema,
      },
    },
    updateUserAvailabilityStatusHandler,
  );

  server.get<{ Querystring: AuditLogQuery }>(
    "/audit-logs",
    {
      config: { permission: "org.audit.read" },
      preHandler: [checkSession],
      schema: { querystring: auditLogQuerySchema },
    },
    auditLogHandler,
  );

  server.get(
    "/audit-logs/features",
    {
      config: { permission: "org.audit.read" },
      preHandler: [checkSession],
    },
    auditLogFeaturesHandler,
  );
}
