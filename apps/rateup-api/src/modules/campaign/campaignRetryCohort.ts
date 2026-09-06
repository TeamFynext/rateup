import prisma from "../../utils/prisma.js";
import { CampaignParticipantStatus } from "../../types/enums.js";
import { RETRYABLE_ERROR_CODES } from "../../utils/waRetryableErrors.js";

/**
 * Participants worth re-attempting for a campaign.
 *
 * Its own module, with nothing but prisma behind it, so both the retry engine
 * and the settle pass can ask the question without importing each other.
 *
 * Only the participant's **latest** message counts. An earlier attempt's
 * permanent failure must not exclude a participant whose most recent attempt hit
 * a frequency cap, and vice versa.
 */
export async function getRetryCohort(campaignId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT cp.id
    FROM "CampaignParticipant" cp
    JOIN LATERAL (
      SELECT wm."errorCode"
      FROM "WaMessageCampaginParticipantMap" m
      JOIN "WaMessage" wm ON wm.id = m."waMessageId"
      WHERE m."campaignParticipantId" = cp.id
      ORDER BY wm."createdAt" DESC
      LIMIT 1
    ) latest ON TRUE
    WHERE cp."campaignId" = ${campaignId}::uuid
      AND cp.status = ${CampaignParticipantStatus.FAILED}
      AND latest."errorCode" = ANY(${RETRYABLE_ERROR_CODES}::int[])
  `;
  return rows.map((row) => row.id);
}

/**
 * Participants whose outcome is not known yet.
 *
 * A message is PENDING before it is handed to Meta and SENT until a delivery
 * webhook lands, so while this is above zero the campaign's failures are still
 * arriving and no conclusion about retries can be drawn. Once it reaches zero,
 * what `getRetryCohort` returns is the whole truth.
 */
export async function countInFlightParticipants(campaignId: string): Promise<number> {
  return prisma.campaignParticipant.count({
    where: {
      campaignId,
      status: {
        in: [CampaignParticipantStatus.PENDING, CampaignParticipantStatus.SENT],
      },
    },
  });
}
