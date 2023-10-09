import { FastifyInstance } from "fastify";
import {
  createOrgHandler,
  getAllTeamsAndMembers,
  updateLogoHandler,
  updateOrgDetailsHandler,
  updateRoleController,
} from "./org.controller";
import { $Sref } from "./org.schema";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";
import { checkRoleHandler } from "../../utils/checkRoleHandler";
import { checkSession } from "../../utils/checkSession";

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
      preHandler: [checkSession, checkRoleHandler(["SUPER_ADMIN"])],
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
    "/update-details",
    {
      preHandler: [verifySession()],
      schema: {
        body: $Sref("updateOrgDetailsSchema"),
      },
    },
    updateOrgDetailsHandler
  );

  server.put(
    "/members/change-role/:id",
    {
      preHandler: [verifySession(), checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        params: $Sref("idParamRequestSchema"),
        body: $Sref("updateRoleSchema"),
      },
    },
    updateRoleController
  );
}
