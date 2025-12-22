import prisma from "../../../utils/prisma.js";
import { LApiSettingInput } from "./apiSetting.schema.js";

export async function getLoyaltyApiSettings(orgId: string) {
  return await prisma.loyaltyApiSettings.findMany({
    where: { orgId },
    include: {
      action: {
        select: {
          id: true,
          name: true,
        },
      },
      reward: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function getLoyaltyApiSettingById(id: string, orgId: string) {
  return await prisma.loyaltyApiSettings.findUnique({
    where: {
      id,
      orgId,
    },
    include: {
      action: {
        select: {
          name: true,
          id: true,
        },
      },
      reward: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function createLoyaltyApiSetting(
  data: LApiSettingInput,
  orgId: string,
) {
  return await prisma.loyaltyApiSettings.create({
    data: {
      ...(data as any),
      actionId: data.actionId?.length ? data.actionId : undefined,
      rewardId: data.rewardId?.length ? data.rewardId : undefined,
      orgId,
    },
  });
}

export async function updateLoyaltyApiSetting(id, data) {
  return await prisma.loyaltyApiSettings.update({
    where: {
      id,
    },
    data: {
      ...data,
      actionId: data.feature === "action" ? data.actionId : undefined,
      rewardId: data.feature === "reward" ? data.rewardId : undefined,
    },
  });
}
