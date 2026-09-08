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

/**
 * Messages this send dispatched whose outcome has not landed yet.
 *
 * The gap `countInFlightParticipants` cannot see. A retry re-attempts
 * participants that are `FAILED` and does not reset them, so during the retry
 * they still read `FAILED` from the *previous* attempt — nothing is PENDING or
 * SENT — while their fresh `WaMessage` has no error code yet and so matches no
 * retry cohort either. For the seconds between the queue draining and Meta's
 * first receipt, a campaign mid-retry therefore looks completely settled, and
 * the retry engine concluded there was nothing left to retry and stopped the
 * chain at attempt 1.
 *
 * Scoped to one send rather than the campaign: these rows are seconds old by
 * construction, so an ancient message that never received a webhook cannot hold
 * a campaign open forever.
 */
export async function countUnresolvedSendMessages(campaignSendId: string): Promise<number> {
  const [row] = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM "WaMessageCampaginParticipantMap" m
    JOIN "WaMessage" wm ON wm.id = m."waMessageId"
    WHERE m."campaignSendId" = ${campaignSendId}::uuid
      AND wm."errorCode" IS NULL
      AND COALESCE(wm.stats->>'failed', '') = ''
      AND COALESCE(wm.stats->>'delivered', '') = ''
      AND COALESCE(wm.stats->>'read', '') = ''
  `;
  return row?.count ?? 0;
}
