import { FastifyRequest, FastifyReply } from "fastify";
import { SubscriptionFeaturePathName } from "../../../../../../../types/enums.js";
import { getVerifySubscriptionHandler } from "../../../../../../../utils/auth.js";

export async function getWhatsappSurveyVerifySubscriptionHandler(
  request: FastifyRequest<{
    Params: { orgId: string };
  }>,
  reply: FastifyReply,
) {
  request.user = { orgId: request.params.orgId } as any;
  await getVerifySubscriptionHandler([
    SubscriptionFeaturePathName.WhatsAppSurvey,
  ])(request, reply);
}
