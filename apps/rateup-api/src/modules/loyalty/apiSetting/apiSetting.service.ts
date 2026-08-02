import prisma from "../../../utils/prisma.js";
import { LApiSettingInput, UpdateApiSettingInput } from "./apiSetting.schema.js";

export async function getLoyaltyApiSettings(orgId: string) {
  return await prisma.loyaltyApiSettings.findMany({
    where: { orgId },
  });
}

export async function getLoyaltyApiSettingById(id: string, orgId: string) {
  return await prisma.loyaltyApiSettings.findUnique({
    where: {
      id,
      orgId,
    },
  });
}

export async function createLoyaltyApiSetting(data: LApiSettingInput, orgId: string) {
  return await prisma.loyaltyApiSettings.create({
    data: {
      ...data,
      actionId: data.actionId?.length ? data.actionId : undefined,
      rewardId: data.rewardId?.length ? data.rewardId : undefined,
      orgId,
    },
  });
}

/**
 * `orgId` is required, and it is part of the where clause.
 *
 * getLoyaltyApiSettings and getLoyaltyApiSettingById beside it were both
 * org-scoped; this one took the setting id alone, and its handler never read
 * `request.user` at all — so an API setting belonging to another org could be
 * repointed at a different action or reward. See issues.txt 20.43.
 */
export async function updateLoyaltyApiSetting(
  id: string,
  data: UpdateApiSettingInput,
  orgId: string,
) {
  return await prisma.loyaltyApiSettings.update({
    where: {
      id,
      orgId,
    },
    data: {
      ...data,
      actionId: data.feature === "action" ? data.actionId : undefined,
      rewardId: data.feature === "reward" ? data.rewardId : undefined,
    },
  });
}
