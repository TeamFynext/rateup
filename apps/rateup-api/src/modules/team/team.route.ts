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
  getTeamChannelsHandler,
  setTeamChannelsHandler,
} from "./team.controller.js";
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
  setTeamChannelsSchema,
  getTeamChannelsResponseSchema,
  CreateTeamInput,
  GetTeamsByOrgInput,
  DeleteTeamInput,
  EditTeamInput,
  IdParamInput,
  tagQuerySchema as TagQueryInput,
  InviteMemberInput,
  InviteCompleteInput,
  GetTeamMembersInput,
  SetTeamChannelsInput,
} from "./team.schema.js";
import { declareAccess } from "../../authz/registry.js";

/**
 * Inviting and removing people, and editing a team, is open to org admins as well as the
 * owner. Granting SUPER_ADMIN is still refused for an ADMIN inviter, in inviteMemberHandler.
 *
 * Creating and deleting a team, and the feature/channel toggles, stay SUPER_ADMIN-only:
 * those decide what a whole team can reach, and only the owner sets that.
 */

// TODO: add checkSession as server.addHook instead of defining it in every route
// move routes which doesn't need checkSession to another route (invitation)
export async function teamRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });
  server.post<{ Body: CreateTeamInput }>(
    "/",
    {
      config: { permission: "teams.manage" },
      preHandler: [
        checkSession,
        getVerifySubscriptionHandler([sf.Team]),
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

  server.get<{ Params: GetTeamsByOrgInput }>(
    "/:orgId",
    {
      config: { permission: "teams.manage_members" },
      preHandler: [checkSession, getVerifySubscriptionHandler([sf.Team])],
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

  server.delete<{ Params: DeleteTeamInput }>(
    "/:id",
    {
      config: { permission: "teams.manage" },
      preHandler: [checkSession, getVerifySubscriptionHandler([sf.Team])],
      schema: {
        params: deleteTeamByIdRequestSchema,
      },
    },
    deleteTeamByIdHandler,
  );

  server.put<{ Body: EditTeamInput; Params: IdParamInput; Querystring: TagQueryInput }>(
    "/edit/:id",
    {
      config: { permission: "teams.manage_members" },
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

  server.post<{ Body: InviteMemberInput }>(
    "/invite",
    {
      config: { permission: "members.invite" },
      preHandler: [
        checkSession,
        getVerifySubscriptionHandler([sf.Team]),
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
  server.put<{ Params: IdParamInput }>(
    "/invite/resend/:id",
    {
      config: { permission: "members.invite" },
      preHandler: [checkSession, getVerifySubscriptionHandler([sf.Team])],
      schema: {
        params: idParamRequestSchema,
      },
    },
    resendInviteMemberHandler,
  );

  server.post<{ Params: InviteCompleteInput }>(
    "/complete-invite/:token",
    {
      config: { access: "public" },
      schema: {
        params: inviteCompleteRequestSchema,
      },
    },
    completeInviteHandler,
  );

  server.delete<{ Params: DeleteTeamInput }>(
    "/invite/:id",
    {
      config: { permission: "members.invite" },
      preHandler: [checkSession, getVerifySubscriptionHandler([sf.Team])],
      schema: {
        params: deleteTeamByIdRequestSchema,
      },
    },
    deleteInviteHandler,
  );

  server.get<{ Params: GetTeamMembersInput }>(
    "/members/:teamId",
    {
      config: { permission: "teams.manage_members" },
      preHandler: [checkSession, getVerifySubscriptionHandler([sf.Team])],
      schema: {
        params: getTeamMembersRequestSchema,
      },
    },
    getTeamMembersHandler,
  );

  server.get<{ Params: GetTeamMembersInput }>(
    "/notmembers/:teamId",
    {
      config: { permission: "teams.manage_members" },
      preHandler: [checkSession, getVerifySubscriptionHandler([sf.Team])],
      schema: {
        params: getTeamMembersRequestSchema,
      },
    },
    getUsersNotInTeamHandler,
  );

  server.get<{ Params: GetTeamMembersInput }>(
    "/invitation/:teamId",
    {
      config: { permission: "members.invite" },
      preHandler: [
        checkSession,
        getVerifySubscriptionHandler([sf.Team]),
        //TODO check team member
      ],
      schema: {
        params: getTeamMembersRequestSchema,
      },
    },
    getTeamMembersFromInviteHandler,
  );

  server.get<{ Params: GetTeamMembersInput }>(
    `/:teamId/survey-languages`,
    {
      preHandler: [checkSession, getVerifySubscriptionHandler([sf.Team]), verifyTeamAccess],
      schema: {
        params: getTeamMembersRequestSchema,
      },
    },
    getSurveyLanguagesByTeamIdHandler,
  );

  server.delete<{ Querystring: { teamId: string; userId: string } }>(
    "/member",
    {
      config: { permission: "teams.manage_members" },
      preHandler: [checkSession],
      schema: {
        querystring: deleteTeamMemberSchema,
      },
    },
    deleteTeamMemberHandler,
  );

  server.post<{ Params: { id: string }; Body: { teamIds: string[]; userEmail: string } }>(
    "/members/:id",
    {
      config: { permission: "teams.manage_members" },
      preHandler: [checkSession],
      schema: {
        params: idParamRequestSchema,
        body: addTeamMemberSchema,
      },
    },
    addMembertoTeamsHandler,
  );

  server.get<{ Params: { teamId: string } }>(
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

  // ── Team Channel Access ───────────────────────────────────────────────────

  server.get<{ Params: { teamId: string } }>(
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

  server.put<{ Params: { teamId: string }; Body: SetTeamChannelsInput }>(
    "/:teamId/channels",
    {
      config: { permission: "channels.manage" },
      preHandler: [checkSession, getVerifySubscriptionHandler([sf.Team])],
      schema: {
        params: getTeamMembersRequestSchema,
        body: setTeamChannelsSchema,
        response: { 200: getTeamChannelsResponseSchema },
      },
    },
    setTeamChannelsHandler,
  );
}
