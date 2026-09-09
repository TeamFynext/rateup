import { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import type { TaskContext, TaskOutcome } from "../task.js";

/**
 * A draft that has actually sent something.
 *
 * One fragment shared by the report, the send backfill and the update, so the three
 * cannot drift apart and none of them has to round-trip a list of ids back into SQL.
 *
 * Either half is enough on its own. `CampaignStats` is the counter the dispatcher
 * increments and survives even if participants were later removed; the participant test
 * catches a campaign whose stats row was never created — the two writes have always been
 * separate, so a campaign can have recipients stamped and no stats at all.
 */
const SENT_DRAFT = Prisma.sql`
  c."status" = 'DRAFT'
  AND (
    COALESCE(s."totalSend", 0) + COALESCE(s."totalDelivered", 0)
      + COALESCE(s."totalRead", 0) + COALESCE(s."totalFailed", 0) > 0
    OR EXISTS (
      SELECT 1 FROM "CampaignParticipant" p
      WHERE p."campaignId" = c."id"
        AND (p."sentAt" IS NOT NULL OR p."status" <> 'PENDING')
    )
  )`;

/**
 * Puts back the campaigns that `20260907090000_campaign_send_sessions` turned into drafts.
 *
 * That migration introduced DRAFT and moved the rows that had never been launched onto
 * it, since the old column default was INACTIVE — the same value the pause button writes,
 * so "never started" and "stopped halfway" were indistinguishable. It guarded the update
 * with three separate proofs that a campaign had run: `startedAt`, `campaignSentAt`, and
 * the existence of a `CampaignSend`.
 *
 * All three are blank for one real cohort. A campaign sent with the Send now button never
 * recorded `startedAt` — the controller only began writing it in this same release — and
 * that path nulls `campaignSentAt` deliberately, because nothing is pending once it has
 * gone out. The third proof cannot rescue what the first two missed: the synthetic
 * `CampaignSend` backfill runs `WHERE campaignSentAt IS NOT NULL OR status <> 'INACTIVE'`,
 * which is the exact complement of the rows being tested, so a campaign that reached the
 * DRAFT update with both stamps null was guaranteed to have no send row either. Three
 * guards, one blind spot, and every immediately-sent campaign that was later paused fell
 * into it.
 *
 * The delivery record is what the guards should have looked at, and it survived intact:
 * `CampaignStats` totals, and participants carrying a `sentAt` or a status past PENDING.
 * A campaign that genuinely never launched has neither, so a real draft is never touched.
 *
 * The migration itself is left alone — it is applied everywhere, and editing it would only
 * break checksums without repairing a single row.
 */
export async function restoreSentCampaignsFromDraft({
  apply,
  log,
}: TaskContext): Promise<TaskOutcome> {
  const affected = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      type: string;
      totalSent: number;
      participantsSent: number;
      hasSend: boolean;
      lastActivity: Date | null;
    }>
  >`
    SELECT
      c."id",
      c."name",
      c."type",
      COALESCE(s."totalSend", 0)::INTEGER AS "totalSent",
      (
        SELECT COUNT(*)::INTEGER FROM "CampaignParticipant" p
        WHERE p."campaignId" = c."id" AND p."sentAt" IS NOT NULL
      ) AS "participantsSent",
      EXISTS (SELECT 1 FROM "CampaignSend" cs WHERE cs."campaignId" = c."id") AS "hasSend",
      (
        SELECT MAX(p."sentAt") FROM "CampaignParticipant" p WHERE p."campaignId" = c."id"
      ) AS "lastActivity"
    FROM "Campaign" c
    LEFT JOIN "CampaignStats" s ON s."campaignId" = c."id"
    WHERE ${SENT_DRAFT}
    ORDER BY c."createdAt" DESC`;

  const details = { campaigns: affected.length, ids: affected.map((c) => c.id) };

  if (!affected.length) {
    return { summary: "No draft campaign shows any sign of having been sent.", details };
  }

  for (const campaign of affected) {
    log(
      `${campaign.name} (${campaign.id}): ${campaign.totalSent} sent, ` +
        `${campaign.participantsSent} recipient(s) stamped` +
        (campaign.hasSend ? ", has a send row" : ", no send row"),
    );
  }

  const drips = affected.filter((c) => c.type === "DRIP").length;
  log(`${affected.length} campaign(s) were sent but read as drafts (${drips} drip)`);

  if (!apply) {
    return {
      summary: `Would restore ${affected.length} sent campaign(s) out of draft.`,
      details,
    };
  }

  // The synthetic "Initial send" the migration's own backfill skipped, so the attempts
  // table shows the send that happened rather than nothing at all. Its shape mirrors
  // that backfill exactly, and COMPLETED keeps it outside the one-live-send-per-campaign
  // partial unique index, so it can never block a future send.
  const sendsCreated = await prisma.$executeRaw`
    INSERT INTO "CampaignSend" (
      "campaignId", "attemptNo", "trigger", "status", "targetStatuses",
      "createdAt", "startedAt", "completedAt",
      "totalTargeted", "totalSent", "totalDelivered", "totalRead", "totalFailed", "totalCompleted",
      "note"
    )
    SELECT
      c."id",
      0,
      'MANUAL'::"CampaignSendTrigger",
      'COMPLETED'::"CampaignSendStatus",
      ARRAY['PENDING']::TEXT[],
      c."createdAt",
      COALESCE(c."campaignSentAt", c."startedAt", c."createdAt"),
      COALESCE(c."endedAt", c."campaignSentAt", c."startedAt", c."createdAt"),
      (SELECT COUNT(*) FROM "CampaignParticipant" p WHERE p."campaignId" = c."id"),
      COALESCE(s."totalSend", 0),
      COALESCE(s."totalDelivered", 0),
      COALESCE(s."totalRead", 0),
      COALESCE(s."totalFailed", 0),
      COALESCE(s."totalCompleted", 0),
      'Backfilled when these campaigns were restored out of draft.'
    FROM "Campaign" c
    LEFT JOIN "CampaignStats" s ON s."campaignId" = c."id"
    WHERE ${SENT_DRAFT}
      AND NOT EXISTS (SELECT 1 FROM "CampaignSend" cs WHERE cs."campaignId" = c."id")`;

  // `startedAt` is filled in from the delivery record, so these campaigns can never fall
  // into the same blind spot again — and so the campaign page stops reporting a send it
  // has the recipients for as never having happened.
  // The UPDATE re-derives the same predicate rather than replaying the ids just read.
  // It has to join `CampaignStats` to do that, and an UPDATE cannot reach a LEFT JOIN, so
  // the campaign is re-selected in a subquery. `startedAt` falls back to the campaign's
  // own creation time: every recipient of an old campaign can have been deleted since,
  // leaving no `sentAt` to read, and a campaign this is declaring finished should not be
  // left claiming it never began.
  const restored = await prisma.$executeRaw`
    UPDATE "Campaign" c
    SET "status" = CASE WHEN c."type" = 'DRIP' THEN 'INACTIVE' ELSE 'COMPLETED' END,
        "startedAt" = COALESCE(
          c."startedAt",
          (SELECT MIN(p."sentAt") FROM "CampaignParticipant" p WHERE p."campaignId" = c."id"),
          c."createdAt"
        ),
        "endedAt" = CASE
          WHEN c."type" = 'DRIP' THEN c."endedAt"
          ELSE COALESCE(
            c."endedAt",
            (SELECT MAX(p."sentAt") FROM "CampaignParticipant" p WHERE p."campaignId" = c."id")
          )
        END
    WHERE c."id" IN (
      SELECT c."id"
      FROM "Campaign" c
      LEFT JOIN "CampaignStats" s ON s."campaignId" = c."id"
      WHERE ${SENT_DRAFT}
    )`;

  log(`restored ${restored} campaign(s) and created ${sendsCreated} missing send row(s)`);

  return {
    summary:
      `Restored ${restored} sent campaign(s) out of draft` +
      (drips ? ` (${drips} drip campaign(s) to paused, the rest to completed)` : "") +
      `, and backfilled ${sendsCreated} missing send row(s).`,
    details: { ...details, restored, sendsCreated, drips },
  };
}
