import { FastifyInstance } from "fastify";
import {
  completeOrgDetailsHandler,
  createOrgHandler,
  deleteOrgAdminHandler,
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
  transferOwnershipHandler,
  updateMemberPermissionsHandler,
  memberActivityHandler,
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
import { declareAccess } from "../../authz/registry.js";
import {
  memberActivityQuerySchema,
  memberPermissionsSchema,
  transferOwnershipSchema,
  type MemberActivityQuery,
  type MemberPermissionsInput,
  type TransferOwnershipInput,
} from "./org.schema.js";
export async function orgRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });

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
      config: { permission: "org.delete" },
      schema: {
        params: byOrgIdParams,
      },
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
    deleteOrgAdminHandler,
  );

  server.get(
    "/teams-and-members",
    {
      config: { permission: "members.manage" },
    },
    getAllTeamsAndMembers,
  );

  server.get(
    "/members-with-teams",
    { config: { permission: "members.read" } },
    getAllMembersWithTeamsHandler,
  );

  server.get(
    "/members-with-teams-and-invitation",
    { config: { permission: "members.invite" } },
    getAllMembersWithTeamsAndInvitationHandler,
  );

  server.put(
    "/update-logo",
    {
      config: { permission: "org.settings" },
      schema: {
        body: updateLogoSchema,
      },
    },
    updateLogoHandler,
  );
  server.put(
    "/update-details",
    {
      config: { permission: "org.settings" },
      schema: {
        body: updateOrgDetailsSchema,
      },
    },
    updateOrgDetailsHandler,
  );

  server.post<{ Body: TransferOwnershipInput }>(
    "/transfer-ownership",
    {
      config: { permission: "org.transfer_ownership" },
      schema: { body: transferOwnershipSchema },
    },
    transferOwnershipHandler,
  );

  server.put<{ Body: UpdateRoleInput; Params: IdParamInput }>(
    "/members/change-role/:id",
    {
      config: { permission: "members.manage_roles" },
      schema: {
        params: idParamRequestSchema,
        body: updateRoleSchema,
      },
    },
    updateRoleController,
  );

  server.get<{ Params: IdParamInput; Querystring: MemberActivityQuery }>(
    "/members/:id/activity",
    {
      config: { permission: "org.audit.read" },
      schema: {
        params: idParamRequestSchema,
        querystring: memberActivityQuerySchema,
      },
    },
    memberActivityHandler,
  );

  server.put<{ Body: MemberPermissionsInput; Params: IdParamInput }>(
    "/members/:id/permissions",
    {
      config: { permission: "members.manage_roles" },
      schema: {
        params: idParamRequestSchema,
        body: memberPermissionsSchema,
      },
    },
    updateMemberPermissionsHandler,
  );

  server.put<{ Body: PauseOrgInput; Params: IdParamInput }>(
    "/pause/:id",
    {
      config: { permission: "members.manage" },
      schema: {
        params: idParamRequestSchema,
        body: pauseOrgSchema,
      },
    },
    pauseOrgHandler,
  );

  server.get(
    "/webhook-client-secret",
    { config: { permission: "org.webhook_secret" } },
    getWebhookClientSecretHandler,
  );

  server.put(
    "/completeorgdetails",
    { config: { permission: "org.settings" } },
    completeOrgDetailsHandler,
  );
  server.get("/orgnameandphone", orgNameAndPhoneNumber);

  // BusinessHour routes
  server.post(
    "/business-hours",
    {
      config: { permission: "org.settings" },
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
      config: { permission: "org.settings" },
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
      config: { permission: "org.settings" },
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
