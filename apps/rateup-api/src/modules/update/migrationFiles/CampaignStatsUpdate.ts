import { CampaignParticipantStatus } from "../../../types/enums";
import prisma from "../../../utils/prisma";
import {
  getLatestStatus,
  WaMessageStats,
} from "../../campaign/campaign.service";

export async function campaignStatsUpdate() {
  const campaigns = await prisma.campaign.findMany({
    select: {
      id: true,
      flowId: true,
      campaignParticipants: {
        select: {
          campaign: {
            select: {
              flowId: true,
            },
          },
          id: true,
          status: true,
          WaMessageCampaginParticipantMap: {
            select: {
              waMessage: {
                select: {
                  stats: true,
                  waCreatedAt: true,
                },
              },
            },
            orderBy: {
              waMessage: {
                waCreatedAt: "desc",
              },
            },
          },
        },
      },
    },
  });

  for (const campaign of campaigns) {
    const stats = getData(campaign);
    const participantUpdates = [];
    const campaignStatsUpserts = [];

    for (const participant of campaign.campaignParticipants) {
      const participantMessages = participant?.WaMessageCampaginParticipantMap;
      let latestStatus = getLatestStatus(participantMessages);

      if (
        campaign?.flowId &&
        participant.status === CampaignParticipantStatus.COMPLETED
      ) {
        latestStatus = CampaignParticipantStatus.COMPLETED;
      }
      if (!latestStatus) continue;

      participantUpdates.push(
        prisma.campaignParticipant.update({
          where: {
            id: participant.id,
          },
          data: {
            status: latestStatus?.toUpperCase(),
          },
        }),
      );
    }

    campaignStatsUpserts.push(
      prisma.campaignStats.upsert({
        where: {
          campaignId: campaign.id,
        },
        create: {
          campaignId: campaign.id,
          ...stats,
        },
        update: {
          ...stats,
        },
      }),
    );

    await prisma.$transaction([...participantUpdates, ...campaignStatsUpserts]);
  }
}

const getData = (campaign) => {
  // Process participants
  let totalRead = 0,
    totalSend = 0,
    totalCompleted = 0,
    totalDelivered = 0,
    totalFailed = 0;

  campaign.campaignParticipants = campaign?.campaignParticipants || [];
  for (const participant of campaign.campaignParticipants) {
    const participantStatus = participant.status;
    const participantMessages = participant?.WaMessageCampaginParticipantMap;

    const latestStatus = getLatestStatus(participantMessages);

    if (participantStatus === CampaignParticipantStatus.FAILED) {
      totalFailed++;
    }
    participantMessages?.forEach(
      (item: {
        waMessage: {
          stats: WaMessageStats;
        };
      }) => {
        if (item.waMessage.stats?.read) totalRead++;
        if (item.waMessage.stats?.sent) totalSend++;
        if (item.waMessage.stats?.delivered) totalDelivered++;
        if (item.waMessage.stats?.failed) totalFailed++;
      },
    );

    if (latestStatus?.toUpperCase() === CampaignParticipantStatus.FAILED) {
      totalFailed++;
    }

    if (
      campaign.flowId &&
      participantStatus === CampaignParticipantStatus.COMPLETED
    ) {
      totalCompleted++;
    }

    participant.waStatus = latestStatus;
  }

  return {
    totalRead,
    totalSend,
    totalCompleted,
    totalDelivered,
    totalFailed,
  };
};
