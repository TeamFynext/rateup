import prisma from "../../utils/prisma.js";
import { CampaignNotFoundError } from "./campaign.errors.js";
import { CampaignParticipantStatus } from "../../types/enums.js";
import {
  FAILURE_REASON_GROUPS,
  waFailureLabel,
  waFailureReasonGroup,
  WaFailureReasonGroup,
} from "../../utils/waRetryableErrors.js";
import type { CampaignSendStatus, CampaignSendTrigger } from "../../../generated/prisma/enums.js";

/**
 * Read models for the campaign Analytics tab.
 *
 * Everything here is scoped through `campaign.team.orgId`, the module's tenancy
 * boundary — a send id alone is never enough to read a row.
 */

/** Confirms the campaign belongs to the org, and returns nothing else. */
async function assertCampaignInOrg(campaignId: string, orgId: string): Promise<void> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, team: { orgId } },
    select: { id: true },
  });
  if (!campaign) throw new CampaignNotFoundError();
}

export interface CampaignSendSummary {
  id: string;
  attemptNo: number;
  trigger: CampaignSendTrigger;
  status: CampaignSendStatus;
  /** "Initial send", "Retry 1", … — computed here so every surface agrees. */
  label: string;
  targetStatuses: string[];
  dripStageId: string | null;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalTargeted: number;
  totalSkipped: number;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  totalCompleted: number;
  /**
   * Messages Meta accepted out of those attempted. For a retry this is the whole
   * point of the row: "re-attempted 340, recovered 210".
   */
  recovered: number;
  /** `recovered / totalTargeted`, or null when nothing was attempted yet. */
  recoveryRate: number | null;
  note: string | null;
}

function sendLabel(attemptNo: number, trigger: CampaignSendTrigger): string {
  if (trigger === "DRIP") return "Drip stage";
  if (attemptNo === 0) return "Initial send";
  return `Retry ${attemptNo}`;
}

export async function getCampaignSends(
  campaignId: string,
  orgId: string,
): Promise<CampaignSendSummary[]> {
  await assertCampaignInOrg(campaignId, orgId);

  const sends = await prisma.campaignSend.findMany({
    where: { campaignId },
    orderBy: { attemptNo: "asc" },
  });

  return sends.map((send) => {
    // Attempted-minus-rejected, not `totalDelivered`: a delivery receipt can
    // arrive hours later, and an attempt row that reads 0 recovered until then
    // would be read as a failed retry rather than a pending one.
    const recovered = Math.max(send.totalSent - send.totalFailed, 0);
    return {
      id: send.id,
      attemptNo: send.attemptNo,
      trigger: send.trigger,
      status: send.status,
      label: sendLabel(send.attemptNo, send.trigger),
      targetStatuses: send.targetStatuses,
      dripStageId: send.dripStageId,
      scheduledFor: send.scheduledFor?.toISOString() ?? null,
      startedAt: send.startedAt?.toISOString() ?? null,
      completedAt: send.completedAt?.toISOString() ?? null,
      totalTargeted: send.totalTargeted,
      totalSkipped: send.totalSkipped,
      totalSent: send.totalSent,
      totalDelivered: send.totalDelivered,
      totalRead: send.totalRead,
      totalFailed: send.totalFailed,
      totalCompleted: send.totalCompleted,
      recovered,
      recoveryRate: send.totalTargeted > 0 ? recovered / send.totalTargeted : null,
      note: send.note,
    };
  });
}

export interface CampaignSendParticipant {
  participantId: string;
  contactId: string;
  name: string | null;
  phone: string | null;
  status: string;
  errorMessage: string | null;
  errorCode: number | null;
  errorLabel: string | null;
  sentAt: string | null;
}

export interface CampaignSendParticipantsPage {
  participants: CampaignSendParticipant[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Who a single attempt went to, and what happened to each of them.
 *
 * Joined through `WaMessageCampaginParticipantMap`, which is the only place a
 * message is tied to a send. `status` filters on the *message's* outcome for
 * this attempt rather than the participant's current status, so a recipient who
 * failed on attempt 1 and succeeded on attempt 2 shows correctly under both.
 */
export async function getCampaignSendParticipants(
  campaignId: string,
  sendId: string,
  orgId: string,
  options: { status?: string; page?: number; pageSize?: number } = {},
): Promise<CampaignSendParticipantsPage> {
  await assertCampaignInOrg(campaignId, orgId);

  const page = Math.max(options.page ?? 1, 1);
  const pageSize = Math.min(Math.max(options.pageSize ?? 50, 1), 200);

  const where = {
    campaignSendId: sendId,
    campaignParticipant: { campaignId },
    ...(options.status ? { campaignParticipant: { campaignId, status: options.status } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.waMessageCampaginParticipantMap.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        waMessage: { select: { errorCode: true, errorMessage: true, createdAt: true } },
        campaignParticipant: {
          select: {
            id: true,
            status: true,
            errorMessage: true,
            sentAt: true,
            contact: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    }),
    prisma.waMessageCampaginParticipantMap.count({ where }),
  ]);

  return {
    total,
    page,
    pageSize,
    participants: rows.map((row) => ({
      participantId: row.campaignParticipant.id,
      contactId: row.campaignParticipant.contact.id,
      name: row.campaignParticipant.contact.name,
      phone: row.campaignParticipant.contact.phone,
      status: row.campaignParticipant.status,
      errorMessage: row.waMessage.errorMessage ?? row.campaignParticipant.errorMessage,
      errorCode: row.waMessage.errorCode,
      // Meta's own wording where the send captured one, our label otherwise —
      // "Graph error 131026" is not something to show a customer.
      errorLabel: row.waMessage.errorCode === null ? null : waFailureLabel(row.waMessage.errorCode),
      sentAt: row.campaignParticipant.sentAt?.toISOString() ?? null,
    })),
  };
}

export interface FunnelStage {
  key: "attempted" | "sent" | "delivered" | "read" | "replied";
  label: string;
  count: number;
  /** Share of the stage above, so the drop-off is readable without arithmetic. */
  rateOfPrevious: number | null;
  /** Share of `attempted`. */
  rateOfAttempted: number | null;
}

export interface FailureReasonRow {
  group: WaFailureReasonGroup;
  label: string;
  description: string;
  count: number;
  /** The individual codes behind the row, for support. */
  codes: { code: number | null; label: string; count: number }[];
}

export interface CampaignAnalytics {
  funnel: FunnelStage[];
  failures: FailureReasonRow[];
  totalFailed: number;
  /** Recipients dropped by the conversation allowance across every attempt. */
  totalSkipped: number;
  attemptCount: number;
}

export async function getCampaignAnalytics(
  campaignId: string,
  orgId: string,
): Promise<CampaignAnalytics> {
  await assertCampaignInOrg(campaignId, orgId);

  const [stats, attempted, sends, failureRows] = await Promise.all([
    prisma.campaignStats.findUnique({ where: { campaignId } }),
    prisma.campaignParticipant.count({ where: { campaignId } }),
    prisma.campaignSend.aggregate({
      where: { campaignId },
      _sum: { totalSkipped: true },
      _count: true,
    }),
    getFailureBreakdownRows(campaignId),
  ]);

  const sent = stats?.totalSend ?? 0;
  const delivered = stats?.totalDelivered ?? 0;
  const read = stats?.totalRead ?? 0;
  const replied = stats?.totalCompleted ?? 0;

  const stages: { key: FunnelStage["key"]; label: string; count: number }[] = [
    { key: "attempted", label: "Attempted", count: attempted },
    { key: "sent", label: "Sent", count: sent },
    { key: "delivered", label: "Delivered", count: delivered },
    { key: "read", label: "Read", count: read },
    { key: "replied", label: "Replied", count: replied },
  ];

  const funnel: FunnelStage[] = stages.map((stage, index) => {
    const previous = index === 0 ? null : stages[index - 1].count;
    return {
      ...stage,
      rateOfPrevious: previous ? stage.count / previous : null,
      rateOfAttempted: attempted ? stage.count / attempted : null,
    };
  });

  return {
    funnel,
    failures: failureRows,
    totalFailed: stats?.totalFailed ?? 0,
    totalSkipped: sends._sum.totalSkipped ?? 0,
    attemptCount: sends._count,
  };
}

/**
 * Failures grouped by reason.
 *
 * Counted over each failed participant's **latest** message only. Counting every
 * failed message would inflate the breakdown by one row per retry, and would not
 * reconcile with the funnel, where a recipient is failed once however many times
 * they were attempted.
 */
async function getFailureBreakdownRows(campaignId: string): Promise<FailureReasonRow[]> {
  const rows = await prisma.$queryRaw<{ errorCode: number | null; count: bigint }[]>`
    SELECT latest."errorCode", COUNT(*)::bigint AS count
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
    GROUP BY latest."errorCode"
  `;

  const byGroup = new Map<WaFailureReasonGroup, FailureReasonRow>();
  for (const { group, label, description } of FAILURE_REASON_GROUPS) {
    byGroup.set(group, { group, label, description, count: 0, codes: [] });
  }

  for (const row of rows) {
    const count = Number(row.count);
    const group = waFailureReasonGroup(row.errorCode);
    const bucket = byGroup.get(group);
    if (!bucket) continue;
    bucket.count += count;
    bucket.codes.push({
      code: row.errorCode,
      // A failure with no code at all predates the errorCode column, or never
      // reached Meta. Saying so beats attributing it to a reason we do not know.
      label: row.errorCode === null ? "Reason not recorded" : waFailureLabel(row.errorCode),
      count,
    });
  }

  // Empty groups are dropped rather than rendered as zeroes — a breakdown of one
  // real reason and three zeroes reads as though something is missing.
  return [...byGroup.values()]
    .filter((row) => row.count > 0)
    .map((row) => ({ ...row, codes: row.codes.sort((a, b) => b.count - a.count) }))
    .sort((a, b) => b.count - a.count);
}
