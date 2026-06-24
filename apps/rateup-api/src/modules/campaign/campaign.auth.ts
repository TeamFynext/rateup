import { FastifyRequest, FastifyReply } from "fastify";
import prisma from "../../utils/prisma.js";
import { CampaignParticipantStatus, SubscriptionFeaturePathName } from "../../types/enums.js";
import { ByCampaignIdParams, SendCampaignInput } from "./campaign.schema.js";
import { log } from "../../utils/logger.js";

export async function getUsageStats(orgId: string) {
  return prisma.usageStats.findUnique({
    where: { orgId },
  });
}

export async function getSubscription(orgId: string) {
  return prisma.subscription.findUnique({
    where: { orgId },
  });
}

async function getCampaignParticipants(
  participantId: string | undefined,
  campaignId: string,
  sendToStatuses: CampaignParticipantStatus[],
) {
  if (participantId) {
    const participant = await prisma.campaignParticipant.findFirst({
      where: { id: participantId },
    });
    return participant ? [participant] : [];
  } else {
    return prisma.campaignParticipant.findMany({
      where: {
        campaignId,
        status: { in: sendToStatuses },
      },
    });
  }
}

export async function verifyMessageMonthlyLimitRestrictionForCampaign(
  request: FastifyRequest<{
    Params: ByCampaignIdParams;
    Body: SendCampaignInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const orgId = request.user.orgId;
    const {
      participantId,
      sendToStatuses = [CampaignParticipantStatus.PENDING, CampaignParticipantStatus.FAILED],
    } = request.body;
    const { campaignId } = request.params;
    const subscription = request.subscription;

    const usage = await getUsageStats(orgId);

    if (!usage || !subscription) {
      return reply.code(404).send({ message: "Usage stats or subscription not found." });
    }

    const campaignData = await getCampaignParticipants(participantId, campaignId, sendToStatuses);
    const newMessagesCount = campaignData.length;
    const monthlyMessageLimit =
      subscription.features?.[SubscriptionFeaturePathName.Whatsapp].count?.monthlyMessageLimit ?? 0;
    const annualLimit = monthlyMessageLimit * 12;

    if (
      subscription?.isAnnualMessageLimit &&
      (usage.annualTemplateMessageCount ?? 0) + newMessagesCount > annualLimit
    ) {
      let errorMessage =
        usage.annualTemplateMessageCount >= annualLimit
          ? "You have reached the maximum annual limit of messages."
          : `Sending messages to all participants will exceed the annual limit. Please reduce the number of messages by ${
              annualLimit - usage.annualTemplateMessageCount
            } to proceed.`;
      return reply.code(403).send({
        message: errorMessage,
        displayMessageInClient: true,
      });
    } else if ((usage.monthlyTemplateMessageCount ?? 0) + newMessagesCount > monthlyMessageLimit) {
      return reply.code(403).send({
        message:
          usage.monthlyTemplateMessageCount >= monthlyMessageLimit
            ? "You have reached the maximum monthly limit of messages."
            : `Sending messages to all participants will exceed the monthly limit. Please reduce the number of messages by ${
                monthlyMessageLimit - usage.monthlyTemplateMessageCount
              } to proceed.`,
        displayMessageInClient: true,
      });
    }
  } catch (error) {
    log.error({ err: error }, "Error verifying message limit:");
    return reply.code(500).send({ message: "Internal server error." });
  }
}
