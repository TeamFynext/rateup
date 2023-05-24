import { FastifyInstance } from "fastify";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";
import {
  completeInviteHandler,
  createTeamHandler,
  deleteTeamByIdHandler,
  getAllTeamsByOrgHandler,
  getTeamMembersHandler,
  inviteMemberHandler,
} from "./team.controller";
import { $Tref } from "./team.schema";
import { checkRoleHandler } from "../../utils/checkRoleHandler";


export async function teamRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      preHandler: [verifySession(), checkRoleHandler("SUPER_ADMIN")],
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
      preHandler: [verifySession(), checkRoleHandler("SUPER_ADMIN")],
      schema: {
        params: $Tref("getTeamsByOrgRequestSchema"),
      },
    },
    getAllTeamsByOrgHandler
  );

  server.delete(
    "/:id",
    {
      preHandler: [verifySession(), checkRoleHandler("SUPER_ADMIN")],
      schema: {
        params: $Tref("deleteTeamByIdRequestSchema"),
      },
    },
    deleteTeamByIdHandler
  );

  server.get("/", async () => {
    return { message: "Teams API working fine!" };
  });

  server.post(
    "/invite",
    {
      preHandler: [verifySession(), checkRoleHandler("SUPER_ADMIN")],
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


    server.get(
    "/members/:teamId",
    {
      preHandler: [verifySession(), checkRoleHandler("SUPER_ADMIN")],
      schema: {
        params: $Tref("getTeamMembersRequestSchema"),
      },
    },
    getTeamMembersHandler
  );
  
}
