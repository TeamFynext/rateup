import { CampaignParticipantStatus } from "../../../types/enums";
import { BATCH_SIZE } from "../../../utils/constants/constants";
import prisma from "../../../utils/prisma";
import {
  getLatestStatus,
  WaMessageStats,
} from "../../campaign/campaign.service";

// const BATCH_SIZE = 10000; // Adjust based on your system's capabilities

export async function campaignStatsUpdate() {
  // Process campaigns in chunks
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const campaigns = await prisma.campaign.findMany({
      take: BATCH_SIZE,
      skip,
      select: {
        id: true,
        flowId: true,
      },
    });

    if (campaigns.length === 0) {
      hasMore = false;
      continue;
    }

    // Process each campaign in the current batch
    for (const campaign of campaigns) {
      await processCampaign(campaign);
    }

    skip += BATCH_SIZE;
  }
  console.log("IMP:-> Campaign stats updated successfully");
}

async function processCampaign(campaign: { id: string; flowId?: string }) {
  let participantSkip = 0;
  let hasMoreParticipants = true;
  let campaignStats = {
    totalRead: 0,
    totalSend: 0,
    totalCompleted: 0,
    totalDelivered: 0,
    totalFailed: 0,
  };

  // Process participants in chunks
  while (hasMoreParticipants) {
    const participants = await prisma.campaignParticipant.findMany({
      where: {
        campaignId: campaign.id,
      },
      take: BATCH_SIZE,
      skip: participantSkip,
      select: {
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
          take: 10, // Limit the number of messages per participant
        },
      },
    });

    if (participants.length === 0) {
      hasMoreParticipants = false;
      continue;
    }

    // Process current batch of participants
    const updates = [];
    for (const participant of participants) {
      const participantMessages = participant?.WaMessageCampaginParticipantMap;
      let latestStatus = getLatestStatus(participantMessages);

      if (
        campaign?.flowId &&
        participant.status === CampaignParticipantStatus.COMPLETED
      ) {
        latestStatus = CampaignParticipantStatus.COMPLETED;
        campaignStats.totalCompleted++;
      }

      if (!latestStatus) continue;

      // Update participant status
      updates.push(
        prisma.campaignParticipant.update({
          where: {
            id: participant.id,
          },
          data: {
            status: latestStatus?.toUpperCase(),
          },
        }),
      );

      // Update stats
      if (participant.status === CampaignParticipantStatus.FAILED) {
        campaignStats.totalFailed++;
      }

      participantMessages?.forEach(
        (item: {
          waMessage: {
            waCreatedAt?: Date;
            stats?: any;
          };
        }) => {
          if (item.waMessage?.stats?.read) campaignStats.totalRead++;
          if (item.waMessage?.stats?.sent) campaignStats.totalSend++;
          if (item.waMessage?.stats?.delivered) campaignStats.totalDelivered++;
          if (item.waMessage?.stats?.failed) campaignStats.totalFailed++;
        },
      );

      if (latestStatus?.toUpperCase() === CampaignParticipantStatus.FAILED) {
        campaignStats.totalFailed++;
      }
    }

    // Execute updates in smaller chunks
    if (updates.length > 0) {
      for (let i = 0; i < updates.length; i += 100) {
        const chunk = updates.slice(i, i + 100);
        await prisma.$transaction(chunk);
      }
    }

    participantSkip += BATCH_SIZE;
  }

  // Update campaign stats
  await prisma.campaignStats.upsert({
    where: {
      campaignId: campaign.id,
    },
    create: {
      campaignId: campaign.id,
      ...campaignStats,
    },
    update: {
      ...campaignStats,
    },
  });
}
