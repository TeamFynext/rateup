import prisma from "../../../../../../../utils/prisma";
import { lActionUpdateInput, loyaltyActionInput } from "./actions.schema";

export async function createLoyaltyAction(
  data: loyaltyActionInput,
  orgId: string,
) {
  await prisma.loyaltyAction.create({
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
    },
  });
}

export async function getLoyaltyActions(orgId: string) {
  return await prisma.loyaltyAction.findMany({
    where: {
      orgId,
    },
  });
}

export async function getLoyaltyActionById(id: string) {
  return await prisma.loyaltyAction.findUnique({
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
    data,
  });
}

export async function deleteLoyaltyActionById(id: string) {
  return await prisma.loyaltyAction.delete({
    where: {
      id,
    },
  });
}
