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

/** The (currently disabled) limit check below only ever reads these three fields.
 *  Typed structurally rather than against a concrete model because both
 *  `getSubscription()` variants feed this — the app-level select in
 *  `subscription.service.ts` and the raw Prisma row in `campaign.auth.ts` — and an org
 *  with no subscription row passes `null`. */
type MessageLimitSubscription = {
  orgId: string;
  features: unknown;
  isAnnualMessageLimit: boolean;
} | null;

export async function verifyTemplateMessageLimit(subscription: MessageLimitSubscription) {
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
