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
  await getVerifySubscriptionHandler([SubscriptionFeaturePathName.Whatsapp])(request, reply);
}

// Thrown by outbound send paths when an org has hit its conversation limit.
// Mapped to a 403 with an upgrade message by the WhatsApp route error handler.
export class ConversationLimitError extends Error {
  statusCode = 403;
  constructor(message = "Conversation limit reached. Upgrade your plan to send more messages.") {
    super(message);
    this.name = "ConversationLimitError";
  }
}

// Guards an OUTBOUND send: throws ConversationLimitError when the org is over its
// conversation allowance. Never call this on the inbound path — receiving customer
// messages and creating/counting conversations must never be blocked.
export async function assertWithinConversationLimit(orgId: string) {
  const withinLimit = await checkConversationLimitExceeded(orgId);
  if (!withinLimit) {
    throw new ConversationLimitError();
  }
}

// Returns true when the org is still WITHIN its conversation allowance.
// Monthly plans cap at `conversation.count.max` per month; annual (pooled) plans
// cap at `max * 12` across the year. Both branches now measure conversations.
export async function checkConversationLimitExceeded(orgId: string) {
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
    ? usage.annualConversationsCount >=
      subscription.features?.[SubscriptionFeaturePathName.Whatsapp]?.conversation?.count?.max * 12
    : usage?.monthlyConversationsCount >=
      subscription.features?.[SubscriptionFeaturePathName.Whatsapp]?.conversation?.count?.max);
}
