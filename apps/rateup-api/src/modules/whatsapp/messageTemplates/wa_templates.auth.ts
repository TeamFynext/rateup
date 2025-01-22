import { FastifyReply, FastifyRequest } from "fastify";
import prisma from "../../../utils/prisma";
import { SubscriptionFeaturePathName } from "../../../types/enums";

export async function verifyMessageMonthlyLimitRestriction(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  let orgId = request.user.orgId;
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

  if (
    subscription?.isAnnualMessageLimit &&
    usage.annualMessageCount >=
      subscription.features?.[SubscriptionFeaturePathName.Whatsapp].count
        ?.monthlyMessageLimit *
        12
  ) {
    return reply.code(403).send({
      message: "You have reached the maximum annual limit of messages.",
      displayMessageInClient: true,
    });
  }
  if (
    usage?.monthlyMessagesCount >=
    subscription.features?.[SubscriptionFeaturePathName.Whatsapp].count
      ?.monthlyMessageLimit
  ) {
    reply.code(403).send({
      message: "You have reached the maximum monthly limit of messages.",
      displayMessageInClient: true,
    });
  }
}
