import { FastifyInstance } from "fastify";
import z, { ZodObject } from "zod";

import { externalSurveyRoutes } from "./surveys/surveys.external.route.js";
import { externalContactRoutes } from "./contacts/contact.external.route.js";
import { externalContactGroupRoutes } from "./contact-groups/contact-group.external.route.js";
import { externalTeamRoutes } from "./teams/team.external.route.js";
import { externalCampaignRoutes } from "./campaigns/campaign.external.route.js";
import { externalWaTemplateRoutes } from "./wa-templates/wa_templates.external.route.js";
import { externalLoyaltyRoutes } from "./loyalty/loyalty.external.route.js";
import { assertApiAccessToken } from "../../modules/apiAccessToken/apiAccessToken.auth.js";
import { isOrgSuspended, ORG_SUSPENDED_MESSAGE } from "../../modules/org/orgSuspension.js";
import { Role } from "../../../generated/prisma/client.js";
import { rateLimit } from "../../utils/rateLimit.js";
import { ExternalApiError, externalErrorHandler } from "./errors.js";

export async function externalV1Routes(server: FastifyInstance) {
  const OrgIdParamsSchema = z.object({
    orgId: z.string(),
  });

  // Fastify error handlers are per-encapsulation-context, so this one registration covers
  // every module below and leaves the root SuperTokens handler in charge everywhere else.
  server.setErrorHandler(externalErrorHandler);

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

  /**
   * Ahead of the token hook on purpose. Verifying a key is a bcrypt compare, which is
   * deliberately expensive; with the org id sitting in the URL, an unauthenticated caller
   * could otherwise spend our CPU at will just by guessing tokens.
   */
  server.addHook(
    "preHandler",
    rateLimit({
      max: 300,
      windowSeconds: 60,
      key: "externalV1Ip",
      throwOnLimit: (kind) =>
        kind === "rate_limited"
          ? new ExternalApiError(429, "rate_limited", "Too many requests")
          : new ExternalApiError(503, "internal_error", "Temporarily unavailable"),
    }),
  );

  server.addHook("preHandler", async (request) => {
    const orgId = (request.params as { orgId?: string } | undefined)?.orgId;
    if (!orgId) {
      throw new ExternalApiError(404, "org_not_found", "Not found");
    }

    request.orgId = orgId;

    if (request.user) {
      request.user.orgId = orgId;
    } else {
      // Seeded so anything reading `request.user.orgId` before the token check runs sees
      // the path org; assertApiAccessToken replaces this object wholesale (with the
      // role) a line below.
      request.user = { orgId, role: Role.SUPER_ADMIN };
    }

    await assertApiAccessToken(request);

    // A suspended account's API key stops working too; otherwise an integration would keep
    // running everything the console just switched off.
    if (await isOrgSuspended(orgId)) {
      throw new ExternalApiError(403, "org_suspended", ORG_SUSPENDED_MESSAGE);
    }
  });

  server.register(externalSurveyRoutes, { prefix: "/surveys" });
  server.register(externalContactRoutes, { prefix: "/contacts" });
  server.register(externalContactGroupRoutes, { prefix: "/contact-groups" });
  server.register(externalTeamRoutes, { prefix: "/teams" });
  server.register(externalCampaignRoutes, { prefix: "/campaigns" });
  server.register(externalWaTemplateRoutes, { prefix: "/wa/templates" });
  server.register(externalLoyaltyRoutes, { prefix: "/loyalty" });
}
