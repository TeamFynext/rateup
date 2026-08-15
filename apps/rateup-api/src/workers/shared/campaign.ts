import type { Prisma } from "../../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";
import type { PrismaTransaction } from "./prismaTypes.js";
import { log } from "./logger.js";

/**
 * Every helper here takes the client to use, defaulting to the global one.
 * Passing the callback client from `prisma.$transaction` is what keeps a
 * failure's bookkeeping — participant status and stats counters — atomic, the
 * way the old BEGIN/COMMIT block was. The failure detail itself lives on the
 * message (`WaMessage.logs`), written by handleWaMessages.
 */

export async function updateCampaignParticipant(
  id: string,
  data: Prisma.CampaignParticipantUpdateInput,
  db: PrismaTransaction = prisma,
) {
  try {
    return await db.campaignParticipant.update({ where: { id }, data });
  } catch (e) {
    log.error(e);
  }
}

export async function updateCampaignStats(
  campaignId: string,
  column: "totalFailed",
  db: PrismaTransaction = prisma,
) {
  try {
    if (column === "totalFailed") {
      await db.campaignStats.update({
        where: { campaignId },
        data: { totalSend: { increment: 1 }, totalFailed: { increment: 1 } },
      });
    }
  } catch (error) {
    log.error({ err: error }, `Error in updateCampaignStats for column ${column}: `);
  }
}

export async function updateDripCampaignParticipant(
  id: string,
  data: Prisma.CampaignParticipantDripStageUpdateInput,
  db: PrismaTransaction = prisma,
) {
  try {
    return await db.campaignParticipantDripStage.update({ where: { id }, data });
  } catch (e) {
    log.error(e);
  }
}

export async function updateDripCampaignStats(
  dripStageId: string,
  column: "totalFailed",
  db: PrismaTransaction = prisma,
) {
  try {
    if (column === "totalFailed") {
      await db.campaignDripStage.update({
        where: { id: dripStageId },
        data: { totalSend: { increment: 1 }, totalFailed: { increment: 1 } },
      });
    }
  } catch (error) {
    log.error({ err: error }, `Error in updateDripCampaignStats for column ${column}: `);
  }
}

export async function addWaMessageCampaignParticipantMap(
  campaignParticipantId: string,
  messageId: string,
) {
  try {
    const waMessage = await prisma.waMessage.findFirst({
      where: { messageId },
      select: { id: true },
    });
    if (!waMessage) return;

    await prisma.waMessageCampaginParticipantMap.create({
      data: { campaignParticipantId, waMessageId: waMessage.id },
    });
  } catch (e) {
    log.error(`Error in addWaMessageCampaignParticipantMap: %o`, e);
  }
}
