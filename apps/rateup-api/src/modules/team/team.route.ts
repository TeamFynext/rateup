import { FastifyInstance } from "fastify";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";
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
} from "./team.controller";
import { $Tref } from "./team.schema";
import { checkRoleHandler } from "../../utils/checkRoleHandler";
import { verifyTeamAdminAccess } from "./team.auth";
import { checkSession } from "../../utils/checkSession";


export async function teamRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      preHandler: [verifySession(), checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        body: $Tref("createTeamRequestSchema"),
        response: {
          201: $Tref("createTeamResponseSchema"),
        },
      },
    },
    createTeamHandler
  );

  server.get(
    "/:orgId",
    {
      preHandler: [verifySession(), checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        params: $Tref("getTeamsByOrgRequestSchema"),
      },
    },
    getAllTeamsByOrgHandler
  );

  // Get list of teams a user is member of
  server.get(
    "/user",
    {
      preHandler: checkSession,
    },
    getTeamsByUserHandler
  )

  server.delete(
    "/:id",
    {
      preHandler: [verifySession(), checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        params: $Tref("deleteTeamByIdRequestSchema"),
      },
    },
    deleteTeamByIdHandler
  );

  server.put(
    "/edit/:id",
    {
      preHandler: [checkSession, verifyTeamAdminAccess],
      schema: {
        body: $Tref("editTeamSchema"),
        params: $Tref("idParamRequestSchema")
      },
    },
    editTeamHandler
  );

  server.get("/", async () => {
    return { message: "Teams API working fine!" };
  });

  server.post(
    "/invite",
    {
      preHandler: [verifySession(), checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        body: $Tref("inviteMemberRequestSchema"),
        response: {
          201: $Tref("inviteMemberRequestResponse"),
        },
      },
    },
    inviteMemberHandler
  );

  server.post(
    "/complete-invite/:token",
    {
      schema: {
        params: $Tref("inviteCompleteRequestSchema"),
      },
    },
    completeInviteHandler
  );

  server.delete(
    "/invite/:id",
    {
      preHandler: [verifySession(), checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        params: $Tref("deleteTeamByIdRequestSchema"),
      },
    },
    deleteInviteHandler
  );



  server.get(
    "/members/:teamId",
    {
      preHandler: [verifySession(), checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        params: $Tref("getTeamMembersRequestSchema"),
      },
    },
    getTeamMembersHandler
  );

  server.get(
    "/invitation/:teamId",
    {
      preHandler: [verifySession(), checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        params: $Tref("getTeamMembersRequestSchema"),
      },
    },
    getTeamMembersFromInviteHandler
  );
  
}
