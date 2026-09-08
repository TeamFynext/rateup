import prisma from "../../utils/prisma.js";
import { CampaignStatus, CampaignType } from "../../types/enums.js";
import { dripStageDueAt } from "../whatsapp/wa_message_scheduler.js";

export interface DripStageSchedule {
  dripStageId: string;
  /** 1-based position in the sequence — what the UI calls "Stage 2". */
  position: number;
  templateName: string | null;
  delay: number;
  delayUnit: string;
  sendAtTime: string | null;
  /** Recipients still waiting on this stage. */
  pending: number;
  /** Recipients this stage has already gone out to. */
  sent: number;
  /** When the earliest of them becomes sendable. Null when none are waiting. */
  nextDueAt: string | null;
  /** When this stage last went out, so a finished stage still carries a date. */
  lastSentAt: string | null;
  /** Already past its time: the next cron tick takes it. */
  overdue: boolean;
}

export interface DripSchedule {
  /** A paused drip has due dates, but nothing will act on them. */
  running: boolean;
  stages: DripStageSchedule[];
  /** The stage that fires next — the one the Overview card leads with. */
  next: DripStageSchedule | null;
}

/**
 * When each stage of a drip next sends, and to how many people.
 *
 * A drip has no `CampaignSend` row booked ahead of time the way a scheduled
 * broadcast does — `processDripCampaigns` derives the due moment on each tick and
 * only then opens a send. So "what happens next" cannot be read off a table; it
 * has to be computed the same way the cron computes it, which is why this shares
 * `dripStageDueAt` with the cron rather than restating the arithmetic.
 *
 * One row per stage, not per recipient: `dripStageDueAt` is monotonic in the
 * participant's join date, so the earliest joiner still pending on a stage is the
 * one whose turn comes first, and `MIN` in SQL is enough.
 */
export async function getDripSchedule(
  campaignId: string,
  orgId: string,
  now: Date = new Date(),
): Promise<DripSchedule | null> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, team: { orgId } },
    select: { type: true, status: true, startedAt: true },
  });
  if (!campaign || campaign.type !== CampaignType.DRIP) return null;

  const rows = await prisma.$queryRaw<
    {
      dripStageId: string;
      delay: number;
      delayUnit: string;
      sendAtTime: string | null;
      templateName: string | null;
      pending: bigint;
      sent: bigint;
      earliestJoin: Date | null;
      lastSentAt: Date | null;
    }[]
  >`
    SELECT
      cds.id AS "dripStageId",
      cds.delay,
      cds."delayUnit",
      cds."sendAtTime",
      wt.data->>'name' AS "templateName",
      -- PENDING is exactly the cron's own condition, so "pending" here is
      -- "the cron will still send this". Every other status -- SENT, DELIVERED,
      -- READ, FAILED -- is a row it is finished with.
      COUNT(cpds.id) FILTER (WHERE cpds.status = 'PENDING') AS "pending",
      COUNT(cpds.id) FILTER (WHERE cpds.status <> 'PENDING') AS "sent",
      MIN(p."createdAt") FILTER (WHERE cpds.status = 'PENDING') AS "earliestJoin",
      MAX(cpds."sentAt") AS "lastSentAt"
    FROM "CampaignDripStage" cds
    LEFT JOIN "CampaignParticipantDripStage" cpds ON cpds."dripStageId" = cds.id
    LEFT JOIN "CampaignParticipant" p ON p.id = cpds."participantId"
    LEFT JOIN "WaTemplate" wt ON wt.id = cds."waTemplateId"
    WHERE cds."campaignId" = ${campaignId}::uuid
    GROUP BY cds.id, cds.delay, cds."delayUnit", cds."sendAtTime", wt.data
    ORDER BY cds.delay ASC, cds.id ASC
  `;

  const stages: DripStageSchedule[] = rows.map((row, index) => {
    const pending = Number(row.pending);
    const dueAt =
      pending > 0 && row.earliestJoin
        ? dripStageDueAt({
            delay: row.delay,
            delayUnit: row.delayUnit,
            sendAtTime: row.sendAtTime,
            participantCreatedAt: row.earliestJoin,
            campaignStartedAt: campaign.startedAt,
          })
        : null;

    return {
      dripStageId: row.dripStageId,
      position: index + 1,
      templateName: row.templateName,
      delay: row.delay,
      delayUnit: row.delayUnit,
      sendAtTime: row.sendAtTime,
      pending,
      sent: Number(row.sent),
      nextDueAt: dueAt ? dueAt.toISOString() : null,
      lastSentAt: row.lastSentAt ? row.lastSentAt.toISOString() : null,
      // A stage whose time passed while the campaign was paused is not late in
      // any way the customer caused; it simply goes out as soon as they resume.
      overdue: dueAt ? dueAt.getTime() <= now.getTime() : false,
    };
  });

  const upcoming = stages.filter((stage) => stage.nextDueAt !== null);
  // Soonest first, and an overdue stage sorts to the front by virtue of its date
  // already having passed — that is the one the next tick will take.
  upcoming.sort((a, b) => Date.parse(a.nextDueAt!) - Date.parse(b.nextDueAt!));

  return {
    running: campaign.status === CampaignStatus.ACTIVE,
    stages,
    next: upcoming[0] ?? null,
  };
}
