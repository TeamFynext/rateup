import { FastifyRequest, FastifyReply } from "fastify";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";
import { getVerifySubscriptionHandler } from "../../../utils/auth.js";
import prisma from "../../../utils/prisma.js";

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

export async function checkMessageLimitExceeded(orgId: string) {
  const usage = await prisma.usageStats.findUnique({
    where: {
      orgId: orgId,
    },
  });

  const subscription = await prisma.subscription.findUnique({
    where: {
      orgId: orgId,
    },
  });

  return !(subscription?.isAnnualMessageLimit
    ? usage.annualMessageCount >=
      subscription.features?.[SubscriptionFeaturePathName.Whatsapp].count
        ?.monthlyMessageLimit *
        12
    : usage?.monthlyMessagesCount >=
      subscription.features?.[SubscriptionFeaturePathName.Whatsapp].count
        ?.monthlyMessageLimit);
}
