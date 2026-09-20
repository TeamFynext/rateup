import { describe, expect, test } from "vitest";

import type { Permission } from "./permissions.js";
import { LEGACY_ROLES, legacyRoleToKey, ROLE_PERMISSIONS, type LegacyRole } from "./roles.js";

/**
 * Every `checkRoleHandler([...])` site and inline role check in the API at the moment the
 * catalogue was introduced, with the permission each converts to. For each legacy role the
 * old guard's answer must equal the new role's answer, so converting a route is a rename.
 *
 * `narrowed` marks the deliberate exceptions: OWNER-only permissions that a second
 * SUPER_ADMIN (now ADMIN) used to hold.
 */
interface Site {
  site: string;
  roles: LegacyRole[];
  permission: Permission;
  narrowed?: true;
}

const S: LegacyRole[] = ["SUPER_ADMIN"];
const SA: LegacyRole[] = ["SUPER_ADMIN", "ADMIN"];

export const PARITY_TABLE: Site[] = [
  // team/team.route.ts
  { site: "POST /api/team", roles: S, permission: "teams.manage" },
  { site: "GET /api/team/:orgId", roles: SA, permission: "teams.manage_members" },
  { site: "DELETE /api/team/:id", roles: S, permission: "teams.manage" },
  { site: "POST /api/team/invite", roles: SA, permission: "members.invite" },
  { site: "PUT /api/team/invite/resend/:id", roles: SA, permission: "members.invite" },
  { site: "DELETE /api/team/invite/:id", roles: SA, permission: "members.invite" },
  { site: "GET /api/team/members/:teamId", roles: SA, permission: "teams.manage_members" },
  { site: "GET /api/team/notmembers/:teamId", roles: SA, permission: "teams.manage_members" },
  { site: "DELETE /api/team/member", roles: SA, permission: "teams.manage_members" },
  { site: "POST /api/team/members/:id", roles: SA, permission: "teams.manage_members" },
  { site: "PUT /api/team/:teamId/channels", roles: S, permission: "channels.manage" },
  // org/org.route.ts
  { site: "DELETE /api/org/:orgId", roles: S, permission: "org.delete", narrowed: true },
  { site: "GET /api/org/teams-and-members", roles: S, permission: "members.manage" },
  { site: "PUT /api/org/members/change-role/:id", roles: S, permission: "members.manage_roles" },
  { site: "PUT /api/org/pause/:id", roles: S, permission: "members.manage" },
  // user/user.route.ts (GET /all and POST /update-recipe are assertRootOrg, not a permission)
  { site: "PUT /api/user/pause/:id", roles: S, permission: "members.manage" },
  { site: "GET /api/user/audit-logs", roles: S, permission: "org.audit.read" },
  {
    site: "PUT /api/user/update-active-status/:userId (non-self)",
    roles: S,
    permission: "members.manage",
  },
  // payment/payment.route.ts, payment/stripe/stripe.route.ts
  { site: "PUT /api/payment/subscriptions/cancel", roles: S, permission: "billing.manage" },
  {
    site: "POST /api/payment/subscriptions/conversation-addon",
    roles: S,
    permission: "billing.manage",
  },
  { site: "PUT /api/payment/subscriptions/change-plan", roles: S, permission: "billing.manage" },
  { site: "PUT /api/payment/order/:orderId", roles: S, permission: "billing.manage" },
  { site: "PUT /api/payment/stripe/subscriptions/cancel", roles: S, permission: "billing.manage" },
  // apiAccessToken/apiAccessToken.route.ts
  { site: "POST /api/api-access-token", roles: S, permission: "api_tokens.manage" },
  { site: "DELETE /api/api-access-token", roles: S, permission: "api_tokens.manage" },
  { site: "POST /api/api-access-token/regenerate", roles: S, permission: "api_tokens.manage" },
  // webhook/webhook.route.ts
  { site: "POST /api/webhook", roles: SA, permission: "webhooks.manage" },
  { site: "DELETE /api/webhook", roles: SA, permission: "webhooks.manage" },
  // integrations/integrations.route.ts
  { site: "POST /api/integrations", roles: SA, permission: "integrations.manage" },
  { site: "PUT /api/integrations/:name", roles: SA, permission: "integrations.manage" },
  {
    site: "POST /api/integrations/google/auth-token",
    roles: SA,
    permission: "integrations.manage",
  },
  // chatbot/chatbot.rout.ts (the ten adminOnly builder routes)
  { site: "POST /api/chatbot/embed-doc", roles: SA, permission: "chatbots.manage" },
  { site: "POST /api/chatbot/embed-doc/file", roles: SA, permission: "chatbots.manage" },
  { site: "DELETE /api/chatbot/delete-source", roles: SA, permission: "chatbots.manage" },
  { site: "DELETE /api/chatbot/delete-many-sources", roles: SA, permission: "chatbots.manage" },
  { site: "POST /api/chatbot/chatbot", roles: SA, permission: "chatbots.manage" },
  { site: "PUT /api/chatbot/chatbot/:chatbotId", roles: SA, permission: "chatbots.manage" },
  { site: "GET /api/chatbot/chatbot/:chatbotId", roles: SA, permission: "chatbots.manage" },
  { site: "GET /api/chatbot/chathistory/:chatbotId", roles: SA, permission: "chatbots.manage" },
  { site: "GET /api/chatbot/chatbots", roles: SA, permission: "chatbots.manage" },
  { site: "DELETE /api/chatbot/chatbot/:chatbotId", roles: SA, permission: "chatbots.manage" },
  // metaAgent/metaAgent.route.ts (adminOnly)
  {
    site: "DELETE /api/meta-agent/:whatsappSettingsId/agent",
    roles: SA,
    permission: "meta_agent.manage",
  },
  {
    site: "POST /api/meta-agent/:whatsappSettingsId/connectors",
    roles: SA,
    permission: "meta_agent.manage",
  },
  {
    site: "PUT /api/meta-agent/:whatsappSettingsId/connectors/:id",
    roles: SA,
    permission: "meta_agent.manage",
  },
  {
    site: "DELETE /api/meta-agent/:whatsappSettingsId/connectors/:id",
    roles: SA,
    permission: "meta_agent.manage",
  },
  {
    site: "POST /api/meta-agent/:whatsappSettingsId/connectors/:id/upsertApiKey",
    roles: SA,
    permission: "meta_agent.manage",
  },
  {
    site: "POST /api/meta-agent/:whatsappSettingsId/connectors/:id/upsertOAuth",
    roles: SA,
    permission: "meta_agent.manage",
  },
  {
    site: "POST /api/meta-agent/:whatsappSettingsId/connectors/:id/upsertCertificate",
    roles: SA,
    permission: "meta_agent.manage",
  },
  {
    site: "POST /api/meta-agent/:whatsappSettingsId/connectors/:connectorId/tools",
    roles: SA,
    permission: "meta_agent.manage",
  },
  {
    site: "PUT /api/meta-agent/:whatsappSettingsId/connectors/:connectorId/tools/:toolId",
    roles: SA,
    permission: "meta_agent.manage",
  },
  {
    site: "DELETE /api/meta-agent/:whatsappSettingsId/connectors/:connectorId/tools/:toolId",
    roles: SA,
    permission: "meta_agent.manage",
  },
  {
    site: "POST /api/meta-agent/:whatsappSettingsId/connectors/:connectorId/tools/:toolId/run",
    roles: SA,
    permission: "meta_agent.manage",
  },
  // response/response.route.ts
  { site: "DELETE /api/response/reset/:surveyId", roles: SA, permission: "responses.manage" },
  {
    site: "DELETE /api/response/:surveyTeamMapId/delete/:id",
    roles: SA,
    permission: "responses.manage",
  },
  { site: "POST /api/response/:surveyId/sync-response", roles: SA, permission: "responses.manage" },
  {
    site: "POST /api/response/export-contacts/:surveyId",
    roles: SA,
    permission: "contacts.export",
  },
  { site: "POST /api/response/summarize/:surveyId", roles: SA, permission: "responses.manage" },
  // contact/conversation/conversation.route.ts
  {
    site: "DELETE /api/contact/conversations/:conversationId",
    roles: SA,
    permission: "inbox.delete",
  },
  { site: "DELETE /api/contact/conversations", roles: SA, permission: "inbox.delete" },
  // loyalty/program/program.route.ts
  { site: "DELETE /api/loyalty/programs/:programId", roles: SA, permission: "loyalty.manage" },
  // inline checks
  { site: "pipeline.auth.ts verifyOwnerForDelete", roles: S, permission: "pipelines.admin" },
  { site: "pipeline.auth.ts verifyOwnerForTeamChange", roles: S, permission: "pipelines.admin" },
  {
    site: "wa_settings.controller.ts ×5 (create/update/delete/subscribe/profile)",
    roles: S,
    permission: "channels.manage",
  },
  {
    site: "wa_templates.controller.ts syncTemplatesHandler",
    roles: SA,
    permission: "templates.sync",
  },
  {
    site: "notification.service.ts notifyConversationLimitReached recipients",
    roles: SA,
    permission: "notify.billing",
  },
  {
    site: "integrations/meta/conversions.service.ts failure recipients",
    roles: SA,
    permission: "notify.integrations",
  },
];

describe("legacy guard parity", () => {
  test("the table covers every guarded route family", () => {
    expect(PARITY_TABLE.length).toBeGreaterThanOrEqual(65);
    expect(new Set(PARITY_TABLE.map((s) => s.site)).size).toBe(PARITY_TABLE.length);
  });

  for (const entry of PARITY_TABLE) {
    test(entry.site, () => {
      for (const legacy of LEGACY_ROLES) {
        const allowedBefore = entry.roles.includes(legacy);
        const allowedNow = ROLE_PERMISSIONS[legacyRoleToKey(legacy, false)].has(entry.permission);
        if (entry.narrowed && legacy === "SUPER_ADMIN") {
          // A second SUPER_ADMIN becomes ADMIN and loses this; the owner keeps it.
          expect(allowedNow).toBe(false);
          expect(ROLE_PERMISSIONS.OWNER.has(entry.permission)).toBe(true);
          continue;
        }
        expect(
          allowedNow,
          `${legacy} → ${legacyRoleToKey(legacy, false)} on ${entry.permission}`,
        ).toBe(allowedBefore);
      }
      // The owner is never weaker than another SUPER_ADMIN was.
      if (entry.roles.includes("SUPER_ADMIN")) {
        expect(ROLE_PERMISSIONS.OWNER.has(entry.permission)).toBe(true);
      }
    });
  }
});
