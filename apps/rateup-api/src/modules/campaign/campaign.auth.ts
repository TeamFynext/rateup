// TODO

import { FastifyRequest, FastifyReply } from "fastify";
import prisma from "../../utils/prisma";
import { SubscriptionFeaturePathName } from "../../types/enums";

export async function verifyCampaignMaxCountRestriction(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const campaignCount = await prisma.campaign.count({
    where: {
      team: {
        orgId: request.user.orgId,
      },
    },
  });

  if (
    campaignCount >=
    request.subscription.features[SubscriptionFeaturePathName.WhatsAppCampaign]
      .count.max
  ) {
    reply
      .code(403)
      .send({
        message: "You have reached the maximum limit of Campaigns",
        displayMessageInClient: true,
      });
  }
}
