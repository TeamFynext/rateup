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
 * How long a SENT participant counts as "outcome not in yet".
 *
 * A message Meta accepted but never confirmed delivered is a phone that was
 * off, a number that never came back online, or a receipt that was lost. Meta
 * can still post `delivered` days later, but a campaign cannot stay open that
 * long: with no cutoff, 87 undelivered messages out of 4,609 held a campaign on
 * ACTIVE indefinitely, and its retry policy never got to conclude. After a day
 * the message's fate is as settled as it is going to get; a late receipt is
 * still applied to the message and the counters, it just no longer holds the
 * campaign.
 */
export const SENT_SETTLES_AFTER_HOURS = 24;

/**
 * Participants no attempt has reached yet.
 *
 * This is what decides whether a campaign's *sending* is finished, which is all
 * COMPLETED means: the queue has drained and every recipient has either been
 * handed to Meta or rejected. Delivery and read receipts keep landing on a
 * completed campaign for as long as Meta sends them — days, for a phone that
 * was off — and are applied to the message and the counters regardless of the
 * campaign's status. Holding the campaign on ACTIVE for them (as this used to,
 * by counting SENT as in flight) kept a campaign open indefinitely for the few
 * percent of recipients Meta never confirms.
 */
export async function countPendingParticipants(campaignId: string): Promise<number> {
  return prisma.campaignParticipant.count({
    where: { campaignId, status: CampaignParticipantStatus.PENDING },
  });
}

/**
 * Participants whose outcome is not known yet.
 *
 * A message is PENDING before it is handed to Meta and SENT until a delivery
 * webhook lands, so while this is above zero the campaign's failures are still
 * arriving and no conclusion about retries can be drawn. Once it reaches zero,
 * what `getRetryCohort` returns is the whole truth.
 *
 * SENT ages out after `SENT_SETTLES_AFTER_HOURS`; PENDING never does, because
 * a participant no attempt has reached is still owed one.
 */
export async function countInFlightParticipants(
  campaignId: string,
  now: Date = new Date(),
): Promise<number> {
  const sentCutoff = new Date(now.getTime() - SENT_SETTLES_AFTER_HOURS * 60 * 60 * 1000);
  return prisma.campaignParticipant.count({
    where: {
      campaignId,
      OR: [
        { status: CampaignParticipantStatus.PENDING },
        {
          status: CampaignParticipantStatus.SENT,
          // A SENT row with no sentAt is one the send path never stamped; treat
          // it as fresh rather than silently settled.
          OR: [{ sentAt: null }, { sentAt: { gt: sentCutoff } }],
        },
      ],
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
