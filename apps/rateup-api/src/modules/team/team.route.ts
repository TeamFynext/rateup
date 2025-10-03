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
} from "./team.controller";
import { $Tref } from "./team.schema";
import { checkRoleHandler } from "../../utils/checkRoleHandler";
import {
  verifyTeamAccess,
  verifyTeamAdminAccess,
  verifyTeamMaxCountRestriction,
  verifyTeamMemberMaxCountRestriction,
} from "./team.auth";
import { checkSession } from "../../utils/checkSession";
import { getVerifySubscriptionHandler } from "../../utils/auth";
import { SubscriptionFeaturePathName as sf } from "../../types/enums";
import { getSurveyLanguagesByTeamIdHandler } from "../survey/survey.controller";

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
        body: $Tref("createTeamRequestSchema"),
        response: {
          201: $Tref("createTeamResponseSchema"),
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
        params: $Tref("getTeamsByOrgRequestSchema"),
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
        params: $Tref("deleteTeamByIdRequestSchema"),
      },
    },
    deleteTeamByIdHandler,
  );

  server.put(
    "/edit/:id",
    {
      preHandler: [checkSession, verifyTeamAdminAccess],
      schema: {
        body: $Tref("editTeamSchema"),
        params: $Tref("idParamRequestSchema"),
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
        body: $Tref("inviteMemberRequestSchema"),
        response: {
          201: $Tref("inviteMemberRequestResponse"),
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
        params: $Tref("idParamRequestSchema"),
      },
    },
    resendInviteMemberHandler,
  );

  server.post(
    "/complete-invite/:token",
    {
      schema: {
        params: $Tref("inviteCompleteRequestSchema"),
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
        params: $Tref("deleteTeamByIdRequestSchema"),
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
        params: $Tref("getTeamMembersRequestSchema"),
      },
    },
    getTeamMembersHandler,
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
        params: $Tref("getTeamMembersRequestSchema"),
      },
    },
    getTeamMembersFromInviteHandler,
  );

  server.get(
    `/:teamId/survey-languages`,
    {
      preHandler: [
        checkSession,
        getVerifySubscriptionHandler([sf.Team]),
        verifyTeamAccess,
      ],
      schema: {
        params: $Tref("getTeamMembersRequestSchema"),
      },
    },
    getSurveyLanguagesByTeamIdHandler,
  );

  server.delete(
    "/member",
    {
      preHandler: [checkSession, checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        querystring: $Tref("deleteTeamMemberSchema"),
      },
    },
    deleteTeamMemberHandler,
  );

  server.post(
    "/members/:id",
    {
      preHandler: [checkSession, checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        params: $Tref("idParamRequestSchema"),
        body: $Tref("addTeamMemberSchema"),
      },
    },
    addMembertoTeamsHandler,
  );
}
