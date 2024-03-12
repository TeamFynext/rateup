import { LcReward } from "@prisma/client";
import prisma from "../../../../utils/prisma";
import { CreateCaRewardEventInput } from "./ca_re.schema";
import {
  CampaignRewardType,
  LoyaltyCustomerRewardType,
} from "../../../../types/enums";
import { createCustomerRewardEvent } from "../customerRewardEvent/cu_re.service";

export async function createCampaignRewardEvent(
  caRewardEvent: CreateCaRewardEventInput,
) {
  const care = await prisma.lCampaignRewardEvent.create({
    data: caRewardEvent,
  });

  const { referrerReward, userReward } =
    await prisma.loyaltyCampaign.findUnique({
      where: {
        id: caRewardEvent.loyaltyCampaignId,
      },
      include: {
        referrerReward: true,
        userReward: true,
      },
    });

  if (referrerReward) {
    await createCustomerRewardEvent({
      pointsEarned: calculatePointsEarned(
        referrerReward,
        care.transactionAmount,
      ),
      customerId: care.referrerId,
      lCampaignRewardEventId: care.id,
      type: LoyaltyCustomerRewardType.Referrer,
    });
  }

  if (userReward) {
    await createCustomerRewardEvent({
      pointsEarned: calculatePointsEarned(userReward, care.transactionAmount),
      customerId: care.customerId,
      lCampaignRewardEventId: care.id,
      type: LoyaltyCustomerRewardType.Customer,
    });
  }
  return care;
}

function calculatePointsEarned(reward: LcReward, transactionAmount: number) {
  if (reward.type === CampaignRewardType.Fixed) {
    return reward.fixedAmount;
  } else if (reward.type === CampaignRewardType.Percentage) {
    return transactionAmount * (reward.percentage / 100);
  }
}
export async function getCampaignRewardsByCampaignId(campaignId: string) {
  return await prisma.lCampaignRewardEvent.findMany({
    where: {
      loyaltyCampaignId: campaignId,
    },
    include: {
      referrer: {
        select: {
          phone: true,
        },
      },
      customer: {
        select: {
          phone: true,
        },
      },
    },
  });
}

export async function getCampaignRewardEventById(id: string) {
  return await prisma.lCampaignRewardEvent.findUnique({
    where: {
      id,
    },
  });
}

export async function deleteCampaignRewardEvent(id: string) {
  return await prisma.lCampaignRewardEvent.delete({
    where: {
      id,
    },
  });
}
