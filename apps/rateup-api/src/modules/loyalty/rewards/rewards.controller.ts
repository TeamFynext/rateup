import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger.js";
import {
  createLoyaltyReward,
  deleteLoyaltyRewardById,
  getLoyaltyRewardById,
  getLoyaltyRewards,
  updateLoyaltyRewardById,
} from "./rewards.service.js";
import {
  loyaltyRewardInput,
  lRewardIdParamInput,
  lRewardUpdateInput,
} from "./rewards.schema.js";
import { loyaltyActionInput } from "../actions/actions.schema.js";
import prisma from "../../../utils/prisma.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";
import { getNestedProperty } from "../../../utils/misc/obj.utils.js";

export async function createLoyaltyRewardHandler(
  request: FastifyRequest<{ Body: loyaltyRewardInput }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await createLoyaltyReward(request.body, orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getLoyaltyRewardsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await getLoyaltyRewards(orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getLoyaltyRewardByIdHandler(
  request: FastifyRequest<{
    Params: lRewardIdParamInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const res = await getLoyaltyRewardById(request.params.rewardId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateLoyaltyRewardByIdHandler(
  request: FastifyRequest<{
    Params: lRewardIdParamInput;
    Body: lRewardUpdateInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const res = await updateLoyaltyRewardById(
      request.body,
      request.params.rewardId,
    );
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function deleteLoyaltyRewardByIdHandler(
  request: FastifyRequest<{
    Params: lRewardIdParamInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const res = await deleteLoyaltyRewardById(
      request.params.rewardId,
      request.user.orgId,
    );
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function verifyLRewardctionMaxCountRestriction(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const orgId = request.user.orgId;
    const count = await prisma.loyaltyReward.count({
      where: {
        orgId,
      },
    });

    const { loyaltyRewardCount } = await prisma.usageStats.findUnique({
      where: {
        orgId,
      },
      select: {
        loyaltyRewardCount: true,
      },
    });

    if (loyaltyRewardCount !== count)
      await prisma.usageStats.update({
        where: {
          orgId,
        },
        data: {
          loyaltyRewardCount: count,
        },
      });

    if (
      count >=
      getNestedProperty(
        request.subscription.features,
        SubscriptionFeaturePathName.LoyaltyReward,
      ).count.max
    ) {
      reply.code(403).send({
        message: "You have reached the maximum limit of loyalty rewards",
        displayMessageInClient: true,
      });
    }
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
