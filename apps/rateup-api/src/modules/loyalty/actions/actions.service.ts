import { LoyaltyAction } from "@prisma/client";
import prisma from "../../../utils/prisma";
import {
  lActionUpdateInput,
  loyaltyActionInput,
  LoyaltyActionType,
} from "./actions.schema";
import { string } from "zod";
import {
  decrementStatsCount,
  updateMonthlyStat,
} from "../../stats/stats.service";
import { SubscriptionFeaturePathName } from "../../../types/enums";

export async function createLoyaltyAction(
  data: loyaltyActionInput,
  orgId: string,
) {
  const action = await prisma.loyaltyAction.create({
    data: {
      name: data.name,
      points: data.points,
      endDate: data.endDate,
      type: data.type,
      refereePoints: data.refereePoints,
      startDate: data.startDate,
      waTemplateId: data.waTemplateId?.length ? data.waTemplateId : undefined,
      orgId: orgId,
      amount: data.amount,
      isAmountBased: data.isAmountBased ?? false,
      maxPoints: data.maxPoints,
      refereeWaTemplateId: data.refereeWaTemplateId?.length
        ? data.refereeWaTemplateId
        : undefined,
      isAmountBasedForReferee: data.isAmountBasedForReferee,
      maxPointsForReferee: data.maxPointsForReferee,
      message: data.message,
      description: data.description,
      action_id: data.action_id,
      rewardId: data.rewardId?.length ? data?.rewardId : undefined,
      refereeRewardId: data.refereeRewardId?.length
        ? data.refereeRewardId
        : undefined,
    },
  });
  await updateMonthlyStat(SubscriptionFeaturePathName.LoyaltyAction, orgId);
  return action;
}
export async function createLoyaltyActionFlowMap({ flowId, actionId }) {
  return await prisma.loyaltyActionFlowMap.create({
    data: {
      flowId,
      actionId,
    },
  });
}
export async function getLoyaltyActions(orgId: string) {
  return await prisma.loyaltyAction.findMany({
    where: {
      orgId,
    },
    include: {
      reward: {
        select: {
          name: true,
        },
      },
    },
  });
}

export async function getLoyaltyActionById(id: string) {
  const action = await prisma.loyaltyAction.findFirst({
    where: {
      id,
    },
    include: {
      LoyaltyActionFlowMap: true,
    },
  });
  return {
    ...action,
    flowId:
      action.LoyaltyActionFlowMap.length &&
      action.LoyaltyActionFlowMap[0].flowId,
  };
}

export async function updateLoyaltyActionById(
  id: string,
  input: lActionUpdateInput,
) {
  const { flowId, ...data } = input;
  if (flowId) {
    const actionFlow = await prisma.loyaltyActionFlowMap.findUnique({
      where: {
        actionId: id,
      },
    });
    if (!actionFlow) {
      await createLoyaltyActionFlowMap({ flowId, actionId: id });
    } else if (actionFlow.flowId !== flowId) {
      await prisma.loyaltyActionFlowMap.update({
        where: {
          actionId: id,
        },
        data: {
          flowId,
        },
      });
    }
  }
  return await prisma.loyaltyAction.update({
    where: {
      id,
    },
    data: {
      ...data,
      waTemplateId: data.waTemplateId?.length ? data.waTemplateId : undefined,
      refereeWaTemplateId: data.refereeWaTemplateId?.length
        ? data.refereeWaTemplateId
        : undefined,
      rewardId: data.rewardId?.length ? data.rewardId : undefined,
      refereeRewardId: data.refereeRewardId?.length
        ? data.refereeRewardId
        : undefined,
    },
  });
}

export async function deleteLoyaltyActionById(id: string, orgId: string) {
  await prisma.loyaltyAction.delete({
    where: {
      id,
    },
  });
  await decrementStatsCount(orgId, "loyaltyActionCount");
}

export async function getReferralLoyaltyAction(orgId) {
  return await prisma.loyaltyAction.findFirst({
    where: {
      type: LoyaltyActionType.ReferralPurchase,
      orgId,
    },
  });
}

export async function getCustomerActions(actionId) {
  return await prisma.loyaltyActionCustomerMap.findMany({
    where: {
      actionId,
    },
  });
}

export async function deactivateExpiredActions() {
  await prisma.loyaltyAction.updateMany({
    where: {
      endDate: {
        lt: new Date(),
      },
    },
    data: {
      active: false,
    },
  });
}
