import prisma from "../../../utils/prisma.js";
import {
  lActionUpdateInput,
  loyaltyActionInput,
  LoyaltyActionType,
} from "./actions.schema.js";
import { string } from "zod";
import {
  decrementStatsCount,
  updateMonthlyStat,
} from "../../stats/stats.service.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";

export async function createLoyaltyAction(
  data: loyaltyActionInput,
  orgId: string,
) {
  const action = await prisma.loyaltyAction.create({
    data: {
      name: data.name,
      points: data.points,
      endDate: new Date(data.endDate),
      type: data.type,
      refereePoints: data.refereePoints,
      startDate: new Date(data.startDate),
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
      flowId: data.flowId?.length ? data.flowId : undefined,
    },
  });
  await updateMonthlyStat(SubscriptionFeaturePathName.LoyaltyAction, orgId);
  return action;
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
  return await prisma.loyaltyAction.findFirst({
    where: {
      id,
    },
  });
}

export async function updateLoyaltyActionById(
  id: string,
  data: lActionUpdateInput,
) {
  return await prisma.loyaltyAction.update({
    where: {
      id,
    },
    data: {
      ...data,
      startDate: data.startDate?.length ? new Date(data.startDate) : undefined,
      endDate: data.endDate?.length ? new Date(data.endDate) : undefined,
      waTemplateId: data.waTemplateId?.length ? data.waTemplateId : undefined,
      refereeWaTemplateId: data.refereeWaTemplateId?.length
        ? data.refereeWaTemplateId
        : undefined,
      rewardId: data.rewardId?.length ? data.rewardId : undefined,
      refereeRewardId: data.refereeRewardId?.length
        ? data.refereeRewardId
        : undefined,
      flowId: data.flowId?.length ? data.flowId : null,
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
