import { CampaignParticipantStatus } from "../../../types/enums";
import prisma from "../../../utils/prisma";
import {
  getLatestStatus,
  WaMessageStats,
} from "../../campaign/campaign.service";

export async function campaignStatsUpdate() {
  const batchSize = 10000;
  let skip = 0;
  let hasMoreParticipants = true;

  while (hasMoreParticipants) {
    const campaignParticipants = await prisma.campaignParticipant.findMany({
      skip,
      take: batchSize,
      select: {
        id: true,
        status: true,
        campaign: {
          select: {
            id: true,
            flowId: true,
          },
        },
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
    });

    if (campaignParticipants.length < batchSize) {
      hasMoreParticipants = false;
    }

    const participantUpdates = [];
    const campaignStatsUpserts = new Map();

    for (const participant of campaignParticipants) {
      const campaign = participant.campaign;
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

      const stats = getData(participant);
      if (!campaignStatsUpserts.has(campaign.id)) {
        campaignStatsUpserts.set(campaign.id, {
          campaignId: campaign.id,
          ...stats,
        });
      } else {
        const existingStats = campaignStatsUpserts.get(campaign.id);
        campaignStatsUpserts.set(campaign.id, {
          ...existingStats,
          totalRead: existingStats.totalRead + stats.totalRead,
          totalSend: existingStats.totalSend + stats.totalSend,
          totalCompleted: existingStats.totalCompleted + stats.totalCompleted,
          totalDelivered: existingStats.totalDelivered + stats.totalDelivered,
          totalFailed: existingStats.totalFailed + stats.totalFailed,
        });
      }
    }

    const campaignStatsUpsertsArray = Array.from(
      campaignStatsUpserts.values(),
    ).map((stats) =>
      prisma.campaignStats.upsert({
        where: {
          campaignId: stats.campaignId,
        },
        create: stats,
        update: stats,
      }),
    );

    await prisma.$transaction([
      ...participantUpdates,
      ...campaignStatsUpsertsArray,
    ]);

    skip += batchSize;
  }

  const emptyCampaign = await prisma.campaign.findMany({
    select: {
      id: true,
    },
    where: {
      campaignParticipants: {
        none: {},
      },
    },
  });
  if (emptyCampaign.length > 0) {
    await prisma.campaignStats.createMany({
      data: emptyCampaign.map((campaign) => ({
        campaignId: campaign.id,
      })),
      skipDuplicates: true,
    });
  }
}

const getData = (participant) => {
  let totalRead = 0,
    totalSend = 0,
    totalCompleted = 0,
    totalDelivered = 0,
    totalFailed = 0;

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
    participant.campaign.flowId &&
    participantStatus === CampaignParticipantStatus.COMPLETED
  ) {
    totalCompleted++;
  }

  participant.waStatus = latestStatus;

  return {
    totalRead,
    totalSend,
    totalCompleted,
    totalDelivered,
    totalFailed,
  };
};
