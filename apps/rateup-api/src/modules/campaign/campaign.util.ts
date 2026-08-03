import { FastifyReply, FastifyRequest } from "fastify";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import { getNestedProperty } from "../../utils/misc/obj.utils.js";
import prisma from "../../utils/prisma.js";

export async function verifyCampaignMaxLimit(request: FastifyRequest, reply: FastifyReply) {
  try {
    let orgId = request.user.orgId;
    const subscription = request.subscription;
    if (!subscription) throw new Error("Subscription not found");

    const campaignCount = await prisma.campaign.count({
      where: {
        team: {
          orgId,
        },
      },
    });

    const whatsappCampaignFeature = getNestedProperty<{ count?: { max?: number } }>(
      subscription.features as object,
      SubscriptionFeaturePathName.Whatsapp,
    );
    if (campaignCount >= (whatsappCampaignFeature?.count?.max ?? Infinity)) {
      throw new Error(
        `You have reached the maximum limit of ${whatsappCampaignFeature?.count?.max} campaigns.`,
      );
    }
  } catch (e) {
    return reply.code(403).send({
      message: e instanceof Error ? e.message : String(e),
      displayMessageInClient: true,
    });
  }
}
