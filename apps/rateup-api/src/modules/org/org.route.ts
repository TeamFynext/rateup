import { FastifyInstance } from "fastify";
import {
  completeOrgDetailsHandler,
  createOrgHandler,
  deleteOrgHandler,
  getAllMembersWithTeamsAndInvitationHandler,
  getAllMembersWithTeamsHandler,
  getAllOrgsHandler,
  getAllTeamsAndMembers,
  getOnboardingChecklistHandler,
  getOrgStatsHandler,
  getWebhookClientSecretHandler,
  orgNameAndPhoneNumber,
  pauseOrgHandler,
  sendDeletionWarningHandler,
  updateLogoHandler,
  updateOrgDetailsHandler,
  updateRoleController,
} from "./org.controller.js";
import {
  createBusinessHourHandler,
  deleteBusinessHourHandler,
  getAllBusinessHoursHandler,
  getBusinessHourHandler,
  updateBusinessHourHandler,
} from "./businessHour.controller.js";
import {
  createBusinessHourSchema,
  businessHourParamsSchema,
  updateBusinessHourSchema,
} from "./businessHour.schema.js";
import { checkRoleHandler } from "../../utils/checkRoleHandler.js";
import { checkSession } from "../../utils/checkSession.js";
import { assertRootOrg } from "../../utils/auth.js";
import {
  byOrgIdParams,
  ByOrgIdParams,
  createOrgRequestSchema,
  createOrgResponseSchema,
  IdParamInput,
  idParamRequestSchema,
  PauseOrgInput,
  pauseOrgSchema,
  updateLogoSchema,
  updateOrgDetailsSchema,
  UpdateRoleInput,
  updateRoleSchema,
} from "./org.schema.js";
export async function orgRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.post(
    "/",
    {
      schema: {
        body: createOrgRequestSchema,
        response: {
          201: createOrgResponseSchema,
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

  server.get<{ Params: { orgId: string } }>(
    "/:orgId",
    {
      schema: {
        params: byOrgIdParams,
      },
      preHandler: assertRootOrg,
    },
    getOrgStatsHandler,
  );

  server.delete<{ Params: { orgId: string } }>(
    "/:orgId",
    {
      schema: {
        params: byOrgIdParams,
      },
      preHandler: [checkRoleHandler(["SUPER_ADMIN"])],
    },
    deleteOrgHandler,
  );

  server.delete<{ Params: { orgId: string } }>(
    "/admin/:orgId",
    {
      schema: {
        params: byOrgIdParams,
      },
      preHandler: assertRootOrg,
    },
    deleteOrgHandler,
  );

  server.get(
    "/teams-and-members",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN"])],
    },
    getAllTeamsAndMembers,
  );

  server.get("/members-with-teams", getAllMembersWithTeamsHandler);

  server.get("/members-with-teams-and-invitation", getAllMembersWithTeamsAndInvitationHandler);

  server.put(
    "/update-logo",
    {
      schema: {
        body: updateLogoSchema,
      },
    },
    updateLogoHandler,
  );
  server.put(
    "/update-details",
    {
      schema: {
        body: updateOrgDetailsSchema,
      },
    },
    updateOrgDetailsHandler,
  );

  server.put<{ Body: UpdateRoleInput; Params: IdParamInput }>(
    "/members/change-role/:id",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        params: idParamRequestSchema,
        body: updateRoleSchema,
      },
    },
    updateRoleController,
  );

  server.put<{ Body: PauseOrgInput; Params: IdParamInput }>(
    "/pause/:id",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN"])],
      schema: {
        params: idParamRequestSchema,
        body: pauseOrgSchema,
      },
    },
    pauseOrgHandler,
  );

  server.get("/webhook-client-secret", getWebhookClientSecretHandler);

  server.put("/completeorgdetails", completeOrgDetailsHandler);
  server.get("/orgnameandphone", orgNameAndPhoneNumber);

  // BusinessHour routes
  server.post(
    "/business-hours",
    {
      schema: {
        body: createBusinessHourSchema,
      },
    },
    createBusinessHourHandler,
  );

  server.get("/business-hours", getAllBusinessHoursHandler);

  server.get(
    "/business-hours/:id",
    {
      schema: {
        params: businessHourParamsSchema,
      },
    },
    getBusinessHourHandler,
  );

  server.put(
    "/business-hours/:id",
    {
      schema: {
        params: businessHourParamsSchema,
        body: updateBusinessHourSchema,
      },
    },
    updateBusinessHourHandler,
  );

  server.delete(
    "/business-hours/:id",
    {
      schema: {
        params: businessHourParamsSchema,
      },
    },
    deleteBusinessHourHandler,
  );

  server.get("/checklist", getOnboardingChecklistHandler);

  server.post<{ Params: ByOrgIdParams }>(
    "/org-deletion-warning-mail/:orgId",
    {
      schema: {
        params: byOrgIdParams,
      },
      preHandler: assertRootOrg,
    },
    sendDeletionWarningHandler,
  );
}
