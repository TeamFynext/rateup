import { FastifyInstance } from "fastify";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";
import {
  createTeamHandler, deleteTeamByIdHandler, getAllTeamsByOrgHandler,
} from "./team.controller";
import { $Tref } from "./team.schema";
import { checkRoleHandler } from "../../utils/checkRoleHandler";
export async function teamRoutes(server: FastifyInstance) {

  server.post(
    "/",
    {
      preHandler: [verifySession(), checkRoleHandler('SUPER_ADMIN')],
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
      preHandler: [verifySession(), checkRoleHandler('SUPER_ADMIN')],
        schema: {
          params: $Tref("getTeamsByOrgRequestSchema"),
        },
    },
    getAllTeamsByOrgHandler
  );

  server.delete(
    "/:id",
    {
      preHandler: [verifySession(), checkRoleHandler('SUPER_ADMIN')],
        schema: {
          params: $Tref("deleteTeamByIdRequestSchema"),
        },
    },
    deleteTeamByIdHandler
  );

  server.get("/", async () => {
    return { message: "Teams API working fine!" };
  });
}