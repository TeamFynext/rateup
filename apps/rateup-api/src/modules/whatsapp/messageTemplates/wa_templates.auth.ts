import { FastifyReply, FastifyRequest } from "fastify";
// import prisma from "../../../utils/prisma.js";
// import { SubscriptionFeaturePathName } from "../../../types/enums.js";
// import { getUsageStat } from "../../stats/stats.service.js";

export async function verifyMessageMonthlyLimitRestriction(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // TODO: re-check
  // try {
  //   let orgId = request.user.orgId;
  //   const subscription = await prisma.subscription.findUnique({
  //     where: {
  //       orgId: orgId,
  //     },
  //   });
  //   await verifyTemplateMessageLimit(subscription);
  // } catch (e) {
  //   return reply.code(403).send({
  //     message: e,
  //     displayMessageInClient: true,
  //   });
  // }
}

export async function verifyTemplateMessageLimit(subscription) {
  // TODO: re-check
  // const usage = await getUsageStat(subscription.orgId);
  // if (
  //   usage &&
  //   subscription?.isAnnualMessageLimit &&
  //   usage.annualTemplateMessageCount >=
  //     subscription.features?.[SubscriptionFeaturePathName.Whatsapp].count?.monthlyMessageLimit * 12
  // ) {
  //   throw new Error("You have reached the maximum annual limit of messages.");
  // }
  // if (
  //   usage?.monthlyTemplateMessageCount >=
  //   subscription.features?.[SubscriptionFeaturePathName.Whatsapp].count?.monthlyMessageLimit
  // ) {
  //   throw new Error("You have reached the maximum monthly limit of messages.");
  // }
}
