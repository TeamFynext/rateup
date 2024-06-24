import { FastifyInstance } from "fastify";
import {
  checkGoogleAccessHandler,
  createGoogleAuthToken,
  createOrgHandler,
  deleteGoogleAuthTokenHandler,
  getAllMembersWithTeamsHandler,
  getAllOrgsHandler,
  getAllTeamsAndMembers,
  getGoogleAuthUrl,
  getOrgStatsHandler,
  pauseOrgHandler,
  updateLogoHandler,
  updateOrgDetailsHandler,
  updateRoleController,
} from "./org.controller";
import { $Sref } from "./org.schema";
import { checkRoleHandler } from "../../utils/checkRoleHandler";
import { checkSession } from "../../utils/checkSession";
import { assertRootOrg } from "../../utils/auth";
import { $UserRef } from "../user/user.schema";
export async function orgRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

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
    createOrgHandler,
  );

  server.get(
    "/",
    {
      preHandler: assertRootOrg,
    },
    getAllOrgsHandler,
  );

  server.get(
    "/:orgId",
    {
      schema: {
        params: $Sref("byOrgIdParams"),
      },
      preHandler: assertRootOrg,
    },
    getOrgStatsHandler,
  );

  server.get(
    "/teams-and-members",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN"])],
    },
    getAllTeamsAndMembers,
  );

  server.get(
    "/members-with-teams",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN"])],
    },
    getAllMembersWithTeamsHandler,
  );

  server.put(
    "/update-logo",
    {
      schema: {
        body: $Sref("updateLogoSchema"),
      },
    },
    updateLogoHandler,
  );
  server.put(
    "/update-details",
    {
      schema: {
        body: $Sref("updateOrgDetailsSchema"),
      },
    },
    updateOrgDetailsHandler,
  );

  server.put(
    "/members/change-role/:id",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        params: $Sref("idParamRequestSchema"),
        body: $Sref("updateRoleSchema"),
      },
    },
    updateRoleController,
  );
  server.get(
    "/auth-url",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
    },
    getGoogleAuthUrl,
  );

  server.post(
    "/auth-token",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
    },
    createGoogleAuthToken,
  );

  server.get(
    "/google-auth-access",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
    },
    checkGoogleAccessHandler,
  );

  server.delete(
    "/auth-token",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
    },
    deleteGoogleAuthTokenHandler,
  );

  server.put(
    "/pause/:id",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        params: $Sref("idParamRequestSchema"),
        body: $Sref("pauseOrgSchema"),
      },
    },
    pauseOrgHandler,
  );
}
