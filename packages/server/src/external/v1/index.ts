import { FastifyInstance } from "fastify";
import z, { ZodObject } from "zod";

import { externalSurveyRoutes } from "./surveys/surveys.external.route.js";
import { externalContactRoutes } from "./contacts/contact.external.route.js";
import { externalContactGroupRoutes } from "./contact-groups/contact-group.external.route.js";
import { externalTeamRoutes } from "./teams/team.external.route.js";
import { externalCampaignRoutes } from "./campaigns/campaign.external.route.js";
import { externalWaTemplateRoutes } from "./wa-templates/wa_templates.external.route.js";
// Loyalty's wire shapes are the same on both versions, so v1 mounts v2's module.
import { externalLoyaltyRoutes } from "../v2/loyalty/loyalty.route.js";
import { assertApiAccessToken } from "../../modules/apiAccessToken/apiAccessToken.auth.js";
import { Role } from "../../generated/prisma/client.js";
import { ExternalApiError } from "../shared/errors.js";
import { registerPartnerHooks } from "../shared/partnerHooks.js";

export const EXTERNAL_V1_PREFIX = "/api/external/v1/:orgId";

/**
 * Partner API v1, kept for integrations built against it: the org is in the URL and the
 * routes answer in their original shapes. Security fixes apply here as on v2 (org scoping,
 * enforced key scopes); new work goes to v2. Only v1 keys are accepted.
 */
export async function externalV1Routes(server: FastifyInstance) {
  const OrgIdParamsSchema = z.object({
    orgId: z.string(),
  });

  server.addHook("onRoute", (routeOptions) => {
    if (!routeOptions.schema) {
      routeOptions.schema = {};
    }

    const params = routeOptions.schema.params;

    if (params instanceof ZodObject) {
      routeOptions.schema.params = OrgIdParamsSchema.extend(params.shape);
    } else {
      routeOptions.schema.params = OrgIdParamsSchema;
    }
  });

  registerPartnerHooks(server, {
    prefix: EXTERNAL_V1_PREFIX,
    authenticate: async (request) => {
      const orgId = (request.params as { orgId?: string } | undefined)?.orgId;
      if (!orgId) {
        throw new ExternalApiError(404, "org_not_found", "Not found");
      }
      // Seeded so anything reading `request.user.orgId` before the key check sees the path
      // org; assertApiAccessToken replaces it once the key verifies.
      request.orgId = orgId;
      request.user = { orgId, role: Role.SUPER_ADMIN };
      return assertApiAccessToken(request, { version: "v1" });
    },
  });

  server.register(externalSurveyRoutes, { prefix: "/surveys" });
  server.register(externalContactRoutes, { prefix: "/contacts" });
  server.register(externalContactGroupRoutes, { prefix: "/contact-groups" });
  server.register(externalTeamRoutes, { prefix: "/teams" });
  server.register(externalCampaignRoutes, { prefix: "/campaigns" });
  server.register(externalWaTemplateRoutes, { prefix: "/wa/templates" });
  server.register(externalLoyaltyRoutes, { prefix: "/loyalty" });
}
