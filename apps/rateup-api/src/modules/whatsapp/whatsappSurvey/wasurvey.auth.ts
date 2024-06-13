import { FastifyRequest, FastifyReply } from "fastify";
import { SubscriptionFeaturePathName } from "../../../types/enums";
import { getVerifySubscriptionHandler } from "../../../utils/auth";
import prisma from "../../../utils/prisma";

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
  return !(
    usage?.monthlyMessagesCount >=
    subscription.features?.[SubscriptionFeaturePathName.Whatsapp].count
      ?.monthlyMessageLimit
  );
}
