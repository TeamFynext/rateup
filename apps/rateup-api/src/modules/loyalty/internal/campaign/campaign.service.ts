import { LoyaltyCampaign } from "@prisma/client";
import prisma from "../../../../utils/prisma";
import { LoyaltyCampaignType } from "../../../../types/enums";
import { log } from "../../../../utils/logger";
import { getOrCreateLCustomerByPhone } from "../customer/customer.service";
import { generateRandomAlphaId } from "../../../../utils/misc/random.utils";
import { createReferralCode } from "../referralCode/referralCode.service";
import { sendTextMessage } from "../../../whatsapp/whatsappSurvey/wasurvey.service";
import { parseMessage } from "../../../whatsapp/whatsappSurvey/wasurvey.utils";
import { WaMessageBody } from "../../../../types/whatsapp.types";

export async function getCampaigns(orgId: string) {
  const campaigns = await prisma.loyaltyCampaign.findMany({
    where: { orgId },
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
  });

  return campaigns;
}

export async function getCampaignById(id: string) {
  const campaign = await prisma.loyaltyCampaign.findUnique({
    where: { id },
  });
  return campaign;
}

export async function createCampaign(
  campaign: Partial<Omit<LoyaltyCampaign, "id">>,
) {
  if (campaign.type === LoyaltyCampaignType.Transaction) {
    delete campaign.maxPerReferrer;
    delete campaign.referrerRewardId;
  }
  const newCampaign = await prisma.loyaltyCampaign.create({
    data: campaign as any, // TODO
  });

  return newCampaign;
}

export async function updateCampaign(id: string, campaign: any) {
  const updatedCampaign = await prisma.loyaltyCampaign.update({
    where: { id },
    data: campaign,
  });

  return updatedCampaign;
}

export async function deleteCampaign(id: string) {
  const deletedCampaign = await prisma.loyaltyCampaign.delete({
    where: { id },
  });

  return deletedCampaign;
}

export async function getParticipantsByCampaignId(campaignId: string) {
  return await prisma.loyaltyCustomer.findMany({
    where: {
      OR: [
        {
          ReferrerEvent: {
            some: {
              loyaltyCampaignId: campaignId,
            },
          },
        },
        {
          CustomerEvent: {
            some: {
              loyaltyCampaignId: campaignId,
            },
          },
        },
      ],
    },
    include: {
      LcReferralCode: {
        where: {
          loyaltyCampaignId: campaignId,
        },
        select: {
          referralCode: true,
        },
      },
    },
  });
}

export type LoyaltyInsights = {
  totalCustomers: number;
  totalPointsRewarded: number;
  totalCampaigns: number;
  totalPointsRedeemed: number;
};
export async function getInsights(orgId: string): Promise<LoyaltyInsights> {
  // total number of customers
  const lc_result = await prisma.loyaltyCustomer.aggregate({
    where: {
      orgId,
    },
    _count: true,
    _sum: {
      points: true,
    },
  });
  const campaign_result = await prisma.loyaltyCampaign.aggregate({
    where: {
      orgId,
    },
    _count: true,
  });

  return {
    totalCustomers: lc_result._count,
    totalPointsRewarded: lc_result._sum.points,
    totalCampaigns: campaign_result._count,
    totalPointsRedeemed: 0,
  };
}

export async function getLoyaltyCampaignInsights(campaignId: string) {
  const lc_result = await prisma.loyaltyCustomer.aggregate({
    where: {
      OR: [
        {
          ReferrerEvent: {
            some: {
              loyaltyCampaignId: campaignId,
            },
          },
        },
        {
          CustomerEvent: {
            some: {
              loyaltyCampaignId: campaignId,
            },
          },
        },
      ],
    },
    _count: true,
    _sum: {
      points: true,
    },
  });

  const transaction_result = await prisma.lCampaignRewardEvent.aggregate({
    where: {
      loyaltyCampaignId: campaignId,
    },
    _count: true,
    _sum: {
      transactionAmount: true,
    },
    _avg: {
      transactionAmount: true,
    },
  });

  return {
    totalPointsRewarded: lc_result._sum.points,
    totalCustomers: lc_result._count,
    totalPointsRedeemed: 0,
    totalTransactions: transaction_result._count,
    totalTransactionAmount: transaction_result._sum.transactionAmount,
    avgTransactionAmount: transaction_result._avg.transactionAmount,
  };
}

interface registerCampaignProps {
  phone: string;
  campaignId: string;
  orgId: string;
}
export async function registerCampaign({
  phone,
  campaignId,
  orgId,
}: registerCampaignProps) {
  const customer = await getOrCreateLCustomerByPhone(orgId, phone);
  const newRcode = {
    orgId: orgId,
    customerId: customer.id,
    loyaltyCampaignId: campaignId,
    referralCode: generateRandomAlphaId(6),
  };
  const referralCode = await createReferralCode(newRcode);
  return { referralCode };
}

export async function handleRegisterMessage(
  orgId: string,
  waMessage: WaMessageBody,
) {
  const { from, message } = parseMessage(waMessage);
  const [_, campaignId] = message.split(" "); // format: /register <campaignId>
  if (!campaignId) {
    log.error("Invalid register message");
    return;
  }
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    log.error("Campaign not found");
    return;
  }
  if (
    ![
      LoyaltyCampaignType.Referral,
      LoyaltyCampaignType.ReferralTransaction,
    ].includes(campaign.type as LoyaltyCampaignType)
  ) {
    log.error("Invalid campaign type");
    return;
  }

  const { referralCode } = await registerCampaign({
    phone: from,
    orgId,
    campaignId,
  });
  await sendTextMessage(
    {
      phone: from,
      orgId,
    },
    "Registration Successful",
    `Your referral code is: ${referralCode.referralCode}`,
  );
  return;
}
