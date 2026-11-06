import { FastifyInstance } from "fastify";

import { externalSurveyRoutes } from "./surveys/surveys.route.js";
import { externalContactRoutes } from "./contacts/contacts.route.js";
import { externalContactGroupRoutes } from "./contact-groups/contactGroups.route.js";
import { externalTeamRoutes } from "./teams/teams.route.js";
import { externalCampaignRoutes } from "./campaigns/campaigns.route.js";
import { externalWaTemplateRoutes } from "./wa-templates/waTemplates.route.js";
import { externalLoyaltyRoutes } from "./loyalty/loyalty.route.js";
import { assertApiKeyV2 } from "../../modules/apiAccessToken/apiAccessToken.auth.js";
import { registerPartnerHooks } from "../shared/partnerHooks.js";

export const EXTERNAL_V2_PREFIX = "/api/external/v2";

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
