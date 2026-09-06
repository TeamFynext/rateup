import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { CampaignSendStatus, CampaignSendTrigger } from "../../../generated/prisma/enums.js";
import type { CampaignSend } from "../../../generated/prisma/client.js";

/**
 * The lifecycle of a "send session" — one initial send or one resend/retry of a
 * campaign.
 *
 * Every outbound campaign message is attributed to exactly one of these rows,
 * which is what turns "this retry re-attempted 340 and 210 landed" from a guess
 * into a query. It is also what makes a retry *possible at all*: BullMQ job ids
 * are scoped to the send (`enqueueCampaignMessages`), so re-sending to a
 * participant the campaign has already messaged is no longer swallowed as a
 * duplicate.
 *
 * Two partial unique indexes in the migration back this up:
 *   - one live broadcast send per campaign
 *   - one live send per drip stage
 * Both are enforced by Postgres, so a manual send racing a due automatic retry
 * fails on insert rather than double-sending. `CampaignSendInProgressError` is
 * that rejection, surfaced.
 */

/** Statuses in which a send still owns the campaign — nothing else may start one. */
export const LIVE_SEND_STATUSES = [
  CampaignSendStatus.SCHEDULED,
  CampaignSendStatus.QUEUING,
  CampaignSendStatus.RUNNING,
] as const;

export class CampaignSendInProgressError extends Error {
  constructor(message = "A send for this campaign is already in progress") {
    super(message);
    this.name = "CampaignSendInProgressError";
  }
}

/** Prisma's code for a unique-constraint violation, including a partial index. */
const UNIQUE_VIOLATION = "P2002";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}

export interface CreateCampaignSendInput {
  campaignId: string;
  trigger: CampaignSendTrigger;
  /** Participant statuses this send targets, e.g. ["PENDING"] or ["FAILED"]. */
  targetStatuses?: string[];
  /** Set for drip sends; a drip send is scoped to one stage. */
  dripStageId?: string | null;
  /** SCHEDULED for a future send, QUEUING for one starting now. */
  status?: CampaignSendStatus;
  scheduledFor?: Date | null;
  note?: string | null;
}

/**
 * Open a new send session.
 *
 * `attemptNo` is allocated as max+1 within the campaign rather than from a
 * sequence, so the numbers a customer sees ("Retry 2") have no gaps. Two
 * concurrent callers can compute the same max; the `@@unique([campaignId,
 * attemptNo])` index turns that into a P2002, which is retried once here. A
 * second failure means something else already owns the campaign, and that is a
 * real conflict rather than a race worth papering over.
 */
export async function createCampaignSend(input: CreateCampaignSendInput): Promise<CampaignSend> {
  const {
    campaignId,
    trigger,
    targetStatuses = [],
    dripStageId = null,
    status = CampaignSendStatus.QUEUING,
    scheduledFor = null,
    note = null,
  } = input;

  for (let attempt = 0; attempt < 2; attempt++) {
    const highest = await prisma.campaignSend.findFirst({
      where: { campaignId },
      orderBy: { attemptNo: "desc" },
      select: { attemptNo: true },
    });
    const attemptNo = (highest?.attemptNo ?? -1) + 1;

    try {
      return await prisma.campaignSend.create({
        data: {
          campaignId,
          attemptNo,
          trigger,
          status,
          targetStatuses,
          dripStageId,
          scheduledFor,
          note,
        },
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Two possibilities, and they need different answers: another caller took
      // this attemptNo (retry), or a live send already owns the campaign (give
      // up). Re-reading the max distinguishes them on the next pass; a second
      // P2002 with a fresh number can only be the live-send index.
      if (attempt === 1) {
        log.warn({ campaignId, trigger }, "Refused a campaign send — one is already live");
        throw new CampaignSendInProgressError();
      }
    }
  }

  // Unreachable: the loop either returns or throws.
  throw new CampaignSendInProgressError();
}

/**
 * The live send for a drip stage, or a new one.
 *
 * Reused deliberately across the drip cron's four-minute re-enqueues. A fresh
 * send per tick would mint fresh job ids, defeating the deduplication that keeps
 * a participant in its original daily batch — every tick would re-send.
 */
export async function getOrCreateDripCampaignSend(
  campaignId: string,
  dripStageId: string,
): Promise<CampaignSend> {
  const live = await prisma.campaignSend.findFirst({
    where: { campaignId, dripStageId, status: { in: [...LIVE_SEND_STATUSES] } },
  });
  if (live) return live;

  return createCampaignSend({
    campaignId,
    trigger: CampaignSendTrigger.DRIP,
    targetStatuses: ["PENDING"],
    dripStageId,
    status: CampaignSendStatus.RUNNING,
  });
}

/** The send currently owning a campaign's broadcast lane, if any. */
export async function getLiveCampaignSend(campaignId: string): Promise<CampaignSend | null> {
  return prisma.campaignSend.findFirst({
    where: { campaignId, dripStageId: null, status: { in: [...LIVE_SEND_STATUSES] } },
    orderBy: { attemptNo: "desc" },
  });
}

/** Fan-out has begun; record how many recipients it actually resolved to. */
export async function startCampaignSend(campaignSendId: string, totalTargeted: number) {
  return prisma.campaignSend.update({
    where: { id: campaignSendId },
    data: {
      status: CampaignSendStatus.RUNNING,
      startedAt: new Date(),
      totalTargeted,
    },
  });
}

/**
 * Close a send.
 *
 * Returns `false` when the row was already terminal, which is how the message
 * processor's completion handler tells a genuine drain from a duplicate one —
 * only the caller that observes the transition sends the completion email and
 * schedules the next retry.
 */
export async function completeCampaignSend(campaignSendId: string): Promise<boolean> {
  const { count } = await prisma.campaignSend.updateMany({
    where: { id: campaignSendId, status: { in: [...LIVE_SEND_STATUSES] } },
    data: { status: CampaignSendStatus.COMPLETED, completedAt: new Date() },
  });
  return count > 0;
}

export async function failCampaignSend(campaignSendId: string, note?: string) {
  return prisma.campaignSend
    .updateMany({
      where: { id: campaignSendId, status: { in: [...LIVE_SEND_STATUSES] } },
      data: { status: CampaignSendStatus.FAILED, completedAt: new Date(), note },
    })
    .catch((error: unknown) => {
      // Bookkeeping must never mask the failure that got us here.
      log.error({ err: error, campaignSendId }, "Could not mark campaign send failed");
    });
}

/**
 * Cancel every live send for a campaign.
 *
 * Used both by "cancel pending retries" and by a manual send that needs to take
 * the lane back from a scheduled retry.
 */
export async function cancelCampaignSends(
  campaignId: string,
  options: { note?: string; onlyScheduled?: boolean } = {},
): Promise<number> {
  const { note, onlyScheduled = false } = options;
  const { count } = await prisma.campaignSend.updateMany({
    where: {
      campaignId,
      status: onlyScheduled ? CampaignSendStatus.SCHEDULED : { in: [...LIVE_SEND_STATUSES] },
    },
    data: { status: CampaignSendStatus.CANCELLED, completedAt: new Date(), note },
  });
  return count;
}

/** Record that the conversation allowance forced part of a cohort to be dropped. */
export async function recordCampaignSendSkipped(
  campaignSendId: string,
  totalSkipped: number,
  note: string,
) {
  return prisma.campaignSend.update({
    where: { id: campaignSendId },
    data: { totalSkipped, note },
  });
}
