import { FastifyInstance } from "fastify";
import { externalSurveyRoutes } from "./surveys/surveys.external.route.js";
import { externalContactRoutes } from "./contacts/contact.external.route.js";
import { externalContactGroupRoutes } from "./contact-groups/contact-group.external.route.js";
import { externalTeamRoutes } from "./teams/team.external.route.js";
import { externalCampaignRoutes } from "./campaigns/campaign.external.route.js";
import { externalWaTemplateRoutes } from "./wa-templates/wa_templates.external.route.js";
import { externalLoyaltyRoutes } from "./loyalty/loyalty.external.route.js";
import { verifyApiAccessTokenHook } from "../../modules/apiAccessToken/apiAccessToken.auth.js";
import z, { ZodObject } from "zod";

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

  server.addHook("preHandler", async (request, reply) => {
    const orgId = (request.params as { orgId?: string } | undefined)?.orgId;
    if (!orgId) {
      reply.code(404).send({ message: "Not found" });
      return;
    }

    (request as any).orgId = orgId;

    if ((request as any).user) {
      (request as any).user.orgId = orgId;
    } else {
      (request as any).user = { orgId };
    }

    await verifyApiAccessTokenHook(request as any, reply);
  });

  server.register(externalSurveyRoutes, { prefix: "/surveys" });
  server.register(externalContactRoutes, { prefix: "/contacts" });
  server.register(externalContactGroupRoutes, { prefix: "/contact-groups" });
  server.register(externalTeamRoutes, { prefix: "/teams" });
  server.register(externalCampaignRoutes, { prefix: "/campaigns" });
  server.register(externalWaTemplateRoutes, { prefix: "/wa/templates" });
  server.register(externalLoyaltyRoutes, { prefix: "/loyalty" });
}
