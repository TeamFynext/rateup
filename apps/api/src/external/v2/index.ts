import { FastifyInstance } from "fastify";

import { externalSurveyRoutes } from "./surveys/surveys.route.js";
import { externalContactRoutes } from "./contacts/contacts.route.js";
import { externalContactGroupRoutes } from "./contact-groups/contactGroups.route.js";
import { externalTeamRoutes } from "./teams/teams.route.js";
import { externalCampaignRoutes } from "./campaigns/campaigns.route.js";
import { externalWaTemplateRoutes } from "./wa-templates/waTemplates.route.js";
import { externalLoyaltyRoutes } from "./loyalty/loyalty.route.js";
import { assertApiKeyV2 } from "../../modules/settings/apiKeys/apiKey.auth.js";
import { registerPartnerHooks } from "../shared/partnerHooks.js";
import { recordV2Route } from "../mcp/catalog.js";
import { EXTERNAL_V2_PREFIX } from "./prefix.js";

export { EXTERNAL_V2_PREFIX };

/**
 * Partner API v2. The URL names no org: an `rk_` key belongs to exactly one, and the key is
 * what says which. v1 keys are refused here (and v2 keys on v1), so a partner moves by minting
 * a v2 key.
 */
export async function externalV2Routes(server: FastifyInstance) {
  registerPartnerHooks(server, {
    prefix: EXTERNAL_V2_PREFIX,
    authenticate: async (request) => {
      await assertApiKeyV2(request);
      return { suspended: null };
    },
  });

  // The MCP server (src/external/mcp) offers each of these routes as a tool.
  server.addHook("onRoute", recordV2Route);

  registerV2Modules(server);
}

/** Every v2 module at its prefix. Exported so v2.routes.test.ts checks exactly this list. */
export function registerV2Modules(server: FastifyInstance) {
  server.register(externalSurveyRoutes, { prefix: "/surveys" });
  server.register(externalContactRoutes, { prefix: "/contacts" });
  server.register(externalContactGroupRoutes, { prefix: "/audiences" });
  server.register(externalTeamRoutes, { prefix: "/teams" });
  server.register(externalCampaignRoutes, { prefix: "/campaigns" });
  server.register(externalWaTemplateRoutes, { prefix: "/wa/templates" });
  server.register(externalLoyaltyRoutes, { prefix: "/loyalty" });
}
