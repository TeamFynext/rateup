import { FastifyInstance } from "fastify";
import {
  completeInviteHandler,
  createTeamHandler,
  deleteTeamByIdHandler,
  getAllTeamsByOrgHandler,
  getTeamsByUserHandler,
  getTeamMembersHandler,
  inviteMemberHandler,
  getTeamMembersFromInviteHandler,
  deleteInviteHandler,
  editTeamHandler,
  resendInviteMemberHandler,
  deleteTeamMemberHandler,
  addMembertoTeamsHandler,
  getUsersNotInTeamHandler,
  getTeamByIdHandler,
  getTeamFeaturesHandler,
  setTeamFeaturesHandler,
  getTeamChannelsHandler,
  setTeamChannelsHandler,
} from "./team.controller.js";
import { checkRoleHandler } from "../../utils/checkRoleHandler.js";
import {
  verifyTeamAccess,
  verifyTeamAdminAccess,
  verifyTeamMaxCountRestriction,
  verifyTeamMemberMaxCountRestriction,
} from "./team.auth.js";
import { checkSession } from "../../utils/checkSession.js";
import { getVerifySubscriptionHandler } from "../../utils/auth.js";
import { SubscriptionFeaturePathName as sf } from "../../types/enums.js";
import { getSurveyLanguagesByTeamIdHandler } from "../survey/survey.controller.js";
import {
  addTeamMemberSchema,
  createTeamRequestSchema,
  createTeamResponseSchema,
  deleteTeamByIdRequestSchema,
  deleteTeamMemberSchema,
  editTeamSchema,
  getTeamMembersRequestSchema,
  getTeamsByOrgRequestSchema,
  idParamRequestSchema,
  inviteCompleteRequestSchema,
  inviteMemberRequestResponse,
  inviteMemberRequestSchema,
  setTeamFeaturesSchema,
  getTeamFeaturesResponseSchema,
  setTeamChannelsSchema,
  getTeamChannelsResponseSchema,
} from "./team.schema.js";

// TODO: add checkSession as server.addHook instead of defining it in every route
// move routes which doesn't need checkSession to another route (invitation)
export async function teamRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      preHandler: [
        checkSession,
        getVerifySubscriptionHandler([sf.Team]),
        checkRoleHandler(["SUPER_ADMIN"]),
        verifyTeamMaxCountRestriction,
      ],
      schema: {
        body: createTeamRequestSchema,
        response: {
          201: createTeamResponseSchema,
        },
      },
    },
    createTeamHandler,
  );

  server.get(
    "/:orgId",
    {
      preHandler: [
        checkSession,
        getVerifySubscriptionHandler([sf.Team]),
        checkRoleHandler(["SUPER_ADMIN"]),
      ],
      schema: {
        params: getTeamsByOrgRequestSchema,
      },
    },
    getAllTeamsByOrgHandler,
  );

  // Get list of teams a user is member of
  server.get(
    "/user",
    {
      preHandler: checkSession,
    },
    getTeamsByUserHandler,
  );

  server.delete(
    "/:id",
    {
      preHandler: [
        checkSession,
        getVerifySubscriptionHandler([sf.Team]),
        checkRoleHandler(["SUPER_ADMIN"]),
      ],
      schema: {
        params: deleteTeamByIdRequestSchema,
      },
    },
    deleteTeamByIdHandler,
  );

  server.put(
    "/edit/:id",
    {
      preHandler: [checkSession, verifyTeamAdminAccess],
      schema: {
        body: editTeamSchema,
        params: idParamRequestSchema,
      },
    },
    editTeamHandler,
  );

  server.get("/", async () => {
    return { message: "Teams API working fine!" };
  });

  server.post(
    "/invite",
    {
      preHandler: [
        checkSession,
        getVerifySubscriptionHandler([sf.Team]),
        checkRoleHandler(["SUPER_ADMIN"]),
        verifyTeamMemberMaxCountRestriction,
      ],
      schema: {
        body: inviteMemberRequestSchema,
        response: {
          201: inviteMemberRequestResponse,
        },
      },
    },
    inviteMemberHandler,
  );
  server.put(
    "/invite/resend/:id",
    {
      preHandler: [
        checkSession,
        getVerifySubscriptionHandler([sf.Team]),
        checkRoleHandler(["SUPER_ADMIN"]),
      ],
      schema: {
        params: idParamRequestSchema,
      },
    },
    resendInviteMemberHandler,
  );

  server.post(
    "/complete-invite/:token",
    {
      schema: {
        params: inviteCompleteRequestSchema,
      },
    },
    completeInviteHandler,
  );

  server.delete(
    "/invite/:id",
    {
      preHandler: [
        checkSession,
        getVerifySubscriptionHandler([sf.Team]),
        checkRoleHandler(["SUPER_ADMIN"]),
      ],
      schema: {
        params: deleteTeamByIdRequestSchema,
      },
    },
    deleteInviteHandler,
  );

  server.get(
    "/members/:teamId",
    {
      preHandler: [
        checkSession,
        getVerifySubscriptionHandler([sf.Team]),
        checkRoleHandler(["SUPER_ADMIN"]),
      ],
      schema: {
        params: getTeamMembersRequestSchema,
      },
    },
    getTeamMembersHandler,
  );

  server.get(
    "/notmembers/:teamId",
    {
      preHandler: [
        checkSession,
        getVerifySubscriptionHandler([sf.Team]),
        checkRoleHandler(["SUPER_ADMIN"]),
      ],
      schema: {
        params: getTeamMembersRequestSchema,
      },
    },
    getUsersNotInTeamHandler,
  );

  server.get(
    "/invitation/:teamId",
    {
      preHandler: [
        checkSession,
        getVerifySubscriptionHandler([sf.Team]),
        // checkRoleHandler(["SUPER_ADMIN"]),
        //TODO check team member
      ],
      schema: {
        params: getTeamMembersRequestSchema,
      },
    },
    getTeamMembersFromInviteHandler,
  );

  server.get(
    `/:teamId/survey-languages`,
    {
      preHandler: [checkSession, getVerifySubscriptionHandler([sf.Team]), verifyTeamAccess],
      schema: {
        params: getTeamMembersRequestSchema,
      },
    },
    getSurveyLanguagesByTeamIdHandler,
  );

  server.delete(
    "/member",
    {
      preHandler: [checkSession, checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        querystring: deleteTeamMemberSchema,
      },
    },
    deleteTeamMemberHandler,
  );

  server.post(
    "/members/:id",
    {
      preHandler: [checkSession, checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        params: idParamRequestSchema,
        body: addTeamMemberSchema,
      },
    },
    addMembertoTeamsHandler,
  );

  server.get(
    "/teams/:teamId",
    {
      preHandler: [checkSession, verifyTeamAccess],
      schema: {
        params: getTeamMembersRequestSchema,
      },
    },
    getTeamByIdHandler,
  );

  // ── Team Feature Access ───────────────────────────────────────────────────

  server.get(
    "/:teamId/features",
    {
      preHandler: [
        checkSession,
        getVerifySubscriptionHandler([sf.Team]),
        // checkRoleHandler(["SUPER_ADMIN"]),
      ],
      schema: {
        params: getTeamMembersRequestSchema,
        response: { 200: getTeamFeaturesResponseSchema },
      },
    },
    getTeamFeaturesHandler,
  );

  server.put(
    "/:teamId/features",
    {
      preHandler: [
        checkSession,
        getVerifySubscriptionHandler([sf.Team]),
        checkRoleHandler(["SUPER_ADMIN"]),
      ],
      schema: {
        params: getTeamMembersRequestSchema,
        body: setTeamFeaturesSchema,
        response: { 200: getTeamFeaturesResponseSchema },
      },
    },
    setTeamFeaturesHandler,
  );

  // ── Team Channel Access ───────────────────────────────────────────────────

  server.get(
    "/:teamId/channels",
    {
      preHandler: [checkSession, getVerifySubscriptionHandler([sf.Team]), verifyTeamAccess],
      schema: {
        params: getTeamMembersRequestSchema,
        response: { 200: getTeamChannelsResponseSchema },
      },
    },
    getTeamChannelsHandler,
  );

  server.put(
    "/:teamId/channels",
    {
      preHandler: [
        checkSession,
        getVerifySubscriptionHandler([sf.Team]),
        checkRoleHandler(["SUPER_ADMIN"]),
      ],
      schema: {
        params: getTeamMembersRequestSchema,
        body: setTeamChannelsSchema,
        response: { 200: getTeamChannelsResponseSchema },
      },
    },
    setTeamChannelsHandler,
  );
}
