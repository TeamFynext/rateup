import { FastifyInstance } from "fastify";
import { createOrgHandler, getAllTeamsAndMembers, updateLogoHandler, updateRoleController } from "./org.controller";
import { $Sref } from "./org.schema";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";
import { checkRoleHandler } from "../../utils/checkRoleHandler";

export async function orgRoutes(server: FastifyInstance) {
  // create survey
  server.post(
    "/",
    {
      schema: {
        body: $Sref("createOrgRequestSchema"),
        response: {
          201: $Sref("createOrgResponseSchema"),
        },
      },
    },
    createOrgHandler
  );

  server.get(
    "/members",
    {
      preHandler: [verifySession(), checkRoleHandler(["SUPER_ADMIN"])],
    },
    getAllTeamsAndMembers
  );

  server.put(
    "/update-logo",
    {
      preHandler: [verifySession()],
      schema: {
        body: $Sref("updateLogoSchema"),
      },
    },
    updateLogoHandler
  );

  server.put(
    "/members/change-role/:id",
    {
      preHandler: [verifySession(), checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        params: $Sref("idParamRequestSchema"),
        body: $Sref("updateRoleSchema")
      },
    },
    updateRoleController
  );

}
