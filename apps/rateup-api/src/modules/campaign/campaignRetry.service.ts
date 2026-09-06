import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { getConversationBudget } from "../subscription/conversationBudget.js";
import { CampaignParticipantStatus, CampaignType } from "../../types/enums.js";
import {
  CampaignRetryStrategy,
  CampaignSendStatus,
  CampaignSendTrigger,
} from "../../../generated/prisma/enums.js";
import type { CampaignRetryPolicy, CampaignSend } from "../../../generated/prisma/client.js";
import {
  cancelCampaignSends,
  CampaignSendInProgressError,
  createCampaignSend,
} from "./campaignSend.service.js";
import { CampaignNotFoundError } from "./campaign.errors.js";
import { countInFlightParticipants, getRetryCohort } from "./campaignRetryCohort.js";

// Re-exported: the cohort query lives in its own module so the settle pass can
// use it without a cycle, but this is still where callers expect to find it.
export { getRetryCohort };
import { enqueueCampaignMessage } from "./campaign.service.js";
import { finishCampaignIfSettled } from "./campaignSettle.service.js";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * The automatic retry engine.
 *
 * Scheduling lives in the database — a `CampaignSend` in `SCHEDULED` is the
 * source of truth — rather than as multi-day BullMQ delayed jobs. That makes
 * cancelling a pending retry an UPDATE, lets the schedule survive a Redis flush,
 * and lets the UI render "next attempt in 3h" without scanning a queue. A cron
 * tick (`campaignRetries`, every five minutes) is what fires the due ones.
 */

/**
 * Offsets from the moment a send drains, for `SMART`.
 *
 * Front-loaded and then decaying: most frequency-cap rejections clear within the
 * first hour, and the ones that do not are usually a longer cap. Trying at +5m
 * and +10m would just spend three attempts discovering the same cap.
 *
 * The first offset is also a *settle delay*, and it is mandatory. When the queue
 * drains, messages that Meta accepted are still `SENT` — they only flip to
 * `FAILED` when the status webhook lands. Building a cohort at drain time + 0
 * would find almost nothing to retry and burn the attempt. 45 minutes is
 * comfortably longer than a Cloud API status webhook takes (seconds, to a few
 * minutes when Meta is backed up), and is what the product surfaces to the
 * customer on the Retries step.
 */
const SMART_OFFSETS_MINUTES = [45, 4 * 60, 12 * 60] as const;

/** Nothing may be scheduled sooner than this after a send drains. */
const MINIMUM_SETTLE_MINUTES = 45;

/** A retry window may not extend further than this past the initial send. */
export const MAX_RETRY_WINDOW_DAYS = 7;

/**
 * The concrete schedule a SMART policy produces, as offsets.
 *
 * Exported so the wizard renders exactly what the engine will do rather than a
 * second copy of the numbers that can drift from it.
 */
export const SMART_SCHEDULE_OFFSETS: readonly string[] = ["+45m", "+4h", "+12h"];

/**
 * When attempt `attemptNo` should fire, measured from `from`.
 *
 * `attemptNo` is the number of the attempt being scheduled: 1 is the first
 * automatic retry, so it takes the first offset.
 */
export function nextAttemptAt(
  policy: Pick<CampaignRetryPolicy, "strategy" | "intervalHours">,
  attemptNo: number,
  from: Date,
): Date {
  if (policy.strategy === CampaignRetryStrategy.FIXED_INTERVAL) {
    return dayjs(from).add(Math.max(policy.intervalHours, 1), "hour").toDate();
  }
  // Past the end of the table (only reachable if maxAttempts ever exceeds the
  // offsets we have), hold at the last, longest interval rather than firing
  // immediately.
  const index = Math.min(attemptNo - 1, SMART_OFFSETS_MINUTES.length - 1);
  const minutes = SMART_OFFSETS_MINUTES[Math.max(index, 0)] ?? MINIMUM_SETTLE_MINUTES;
  return dayjs(from).add(minutes, "minute").toDate();
}

/** `"HH:mm"` as minutes past local midnight, or null if unparseable. */
function parseClock(value: string | null): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Push a fire time out of the policy's quiet hours.
 *
 * Quiet hours are local to the policy's timezone and may wrap midnight
 * (22:00–08:00 is the common case), so "inside the window" is an OR when the
 * start is after the end and an AND when it is not. A time inside the window is
 * moved to the window's end on the appropriate day — never earlier, so this can
 * only ever delay a retry.
 */
export function shiftOutOfQuietHours(
  when: Date,
  policy: Pick<CampaignRetryPolicy, "quietHoursStart" | "quietHoursEnd" | "timezone">,
): Date {
  const start = parseClock(policy.quietHoursStart);
  const end = parseClock(policy.quietHoursEnd);
  if (start === null || end === null || start === end) return when;

  const zone = policy.timezone || "Etc/UTC";
  let local: dayjs.Dayjs;
  try {
    local = dayjs(when).tz(zone);
  } catch {
    // An unknown timezone must not stop a retry; UTC is the schema default.
    log.warn({ zone }, "Unknown timezone on retry policy — treating quiet hours as UTC");
    local = dayjs(when).utc();
  }

  const minutes = local.hour() * 60 + local.minute();
  const wraps = start > end;
  const inside = wraps ? minutes >= start || minutes < end : minutes >= start && minutes < end;
  if (!inside) return when;

  // The end of the window: today when we are in the pre-dawn tail of a wrapping
  // window, tomorrow when we are in the evening head of one.
  const endOfWindow = local
    .hour(Math.floor(end / 60))
    .minute(end % 60)
    .second(0)
    .millisecond(0);
  const resolved = wraps && minutes >= start ? endOfWindow.add(1, "day") : endOfWindow;
  return resolved.toDate();
}

/**
 * Decide and record the next automatic attempt after `campaignSendId` drained.
 *
 * Called from the message processor's completion handler, once, by the finisher
 * that observed the drain. Every reason to stop is checked here rather than at
 * fire time, so a campaign with retries exhausted leaves no row behind for the
 * cron to walk.
 */
export async function scheduleNextRetry(campaignSendId: string): Promise<CampaignSend | null> {
  try {
    const send = await prisma.campaignSend.findUnique({
      where: { id: campaignSendId },
      include: {
        campaign: {
          select: {
            id: true,
            type: true,
            CampaignRetryPolicy: true,
          },
        },
      },
    });
    if (!send) return null;

    // Drip campaigns have their own cadence, owned by the drip cron, which
    // re-enqueues every four minutes. A retry engine on top of that would fight it.
    if (send.campaign.type === CampaignType.DRIP || send.dripStageId) return null;

    const policy = send.campaign.CampaignRetryPolicy;
    if (!policy?.enabled) return null;

    const nextAttemptNo = send.attemptNo + 1;
    if (nextAttemptNo > policy.maxAttempts) {
      log.info({ campaignSendId }, "Retry attempts exhausted");
      return null;
    }

    const now = new Date();
    let scheduledFor = nextAttemptAt(policy, nextAttemptNo, send.completedAt ?? now);

    // Never sooner than the settle delay, however the offsets were configured —
    // a FIXED_INTERVAL of 1 hour would otherwise build a cohort from statuses
    // that have not landed yet.
    const earliest = dayjs(now).add(MINIMUM_SETTLE_MINUTES, "minute").toDate();
    if (scheduledFor < earliest) scheduledFor = earliest;

    scheduledFor = shiftOutOfQuietHours(scheduledFor, policy);

    // Checked after the quiet-hours shift, not before: a retry pushed past the
    // window end by quiet hours is out of time, and firing it anyway would
    // ignore the customer's own deadline.
    if (policy.windowEndsAt && scheduledFor > policy.windowEndsAt) {
      log.info({ campaignSendId }, "Retry window has closed");
      return null;
    }

    // Nothing to retry, and nothing that could still become something to retry:
    // book no attempt at all.
    //
    // The cohort is deliberately built at fire time, because failures land over
    // Kafka after the queue drains — so an empty cohort *now* usually means
    // "not yet", not "never". The exception is when no participant is still in
    // flight: once every message has reached DELIVERED or READ, no webhook can
    // turn one into a failure, and the only honest cohort is the one we can see.
    // Scheduling anyway parked the campaign on RETRYING for the whole window and
    // then cancelled the send the moment it came due.
    const inFlight = await countInFlightParticipants(send.campaignId);
    if (inFlight === 0 && (await getRetryCohort(send.campaignId)).length === 0) {
      log.info({ campaignSendId }, "Nothing left to retry — no attempt scheduled");
      return null;
    }

    return await createCampaignSend({
      campaignId: send.campaignId,
      trigger: CampaignSendTrigger.AUTO_RETRY,
      targetStatuses: [CampaignParticipantStatus.FAILED],
      status: CampaignSendStatus.SCHEDULED,
      scheduledFor,
      note: `Automatic retry ${nextAttemptNo} of ${policy.maxAttempts}.`,
    });
  } catch (error) {
    if (error instanceof CampaignSendInProgressError) {
      // Something else already owns the campaign — a manual resend, most likely.
      // That send's own drain will schedule the next retry.
      log.info({ campaignSendId }, "Skipped scheduling a retry — a send is already live");
      return null;
    }
    // A retry that cannot be scheduled must not fail the send that just finished.
    log.error({ err: error, campaignSendId }, "Could not schedule the next campaign retry");
    return null;
  }
}

/**
 * Fire every retry that has come due.
 *
 * Claims rows with a conditional UPDATE ... RETURNING so a second cron tick — or
 * a second bullmq replica — cannot pick up a send this one is already starting.
 */
export async function processScheduledCampaignSends(): Promise<{
  fired: number;
  cancelled: number;
}> {
  const due = await prisma.$queryRaw<{ id: string; campaignId: string; attemptNo: number }[]>`
    UPDATE "CampaignSend"
    SET status = 'QUEUING'::"CampaignSendStatus"
    WHERE id IN (
      SELECT id FROM "CampaignSend"
      WHERE status = 'SCHEDULED'::"CampaignSendStatus"
        AND "scheduledFor" <= now()
      ORDER BY "scheduledFor"
      LIMIT 100
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, "campaignId", "attemptNo"
  `;

  let fired = 0;
  let cancelled = 0;

  for (const send of due) {
    try {
      const result = await fireScheduledSend(send);
      if (result === "fired") fired++;
      else cancelled++;
    } catch (error) {
      log.error(
        { err: error, campaignSendId: send.id },
        "Failed to fire a scheduled campaign send",
      );
      await prisma.campaignSend
        .update({
          where: { id: send.id },
          data: {
            status: CampaignSendStatus.FAILED,
            completedAt: new Date(),
            note: "Could not be started.",
          },
        })
        .catch(() => {});
    }
  }

  if (due.length) log.info({ fired, cancelled }, "Processed due campaign retries");
  return { fired, cancelled };
}

async function fireScheduledSend(send: {
  id: string;
  campaignId: string;
  attemptNo: number;
}): Promise<"fired" | "cancelled"> {
  const cancel = async (note: string) => {
    await prisma.campaignSend.update({
      where: { id: send.id },
      data: { status: CampaignSendStatus.CANCELLED, completedAt: new Date(), note },
    });
    // A cancelled retry was the last thing holding the campaign open. Without
    // this it sat on RETRYING for good, waiting for an attempt that will never
    // run — the same dead end as a campaign that never left ACTIVE.
    await finishCampaignIfSettled(send.campaignId);
    return "cancelled" as const;
  };

  const campaign = await prisma.campaign.findUnique({
    where: { id: send.campaignId },
    select: { dailySendLimit: true, team: { select: { orgId: true } } },
  });
  if (!campaign) return cancel("The campaign no longer exists.");

  const cohort = await getRetryCohort(send.campaignId);
  if (!cohort.length) {
    return cancel("Nothing left to retry — no recipients failed with a retryable error.");
  }

  // "Send what fits, warn." Truncating is better than starting a send that fails
  // one message at a time deep in the dispatcher, which is the behaviour
  // campaign.preflight.ts already documents and avoids for manual sends.
  const budget = await getConversationBudget(campaign.team.orgId);
  let targeted = cohort;
  let skipped = 0;

  if (budget.metered) {
    const remaining = budget.remaining ?? 0;
    if (remaining === 0) {
      return cancel("Skipped — the org's conversation allowance is fully used.");
    }
    if (remaining < cohort.length) {
      skipped = cohort.length - remaining;
      targeted = cohort.slice(0, remaining);
    }
  }

  await prisma.campaignSend.update({
    where: { id: send.id },
    data: {
      totalSkipped: skipped,
      note: skipped
        ? `Retried ${targeted.length} of ${cohort.length} recipients; ${skipped} did not fit in the remaining conversation allowance.`
        : `Retrying ${targeted.length} recipient(s) that failed with a retryable error.`,
    },
  });

  // The exact cohort is passed down, not just the status filter. Re-deriving it
  // in the worker would undo the truncation above — and could widen it, since
  // more failures can land between here and the fan-out.
  const enqueued = await enqueueCampaignMessage({
    campaignId: send.campaignId,
    campaignSendId: send.id,
    sendToStatuses: [CampaignParticipantStatus.FAILED],
    participantIds: targeted,
    dailySendLimit: campaign.dailySendLimit ?? undefined,
  });
  if (!enqueued.status) throw new Error(enqueued.message);

  return "fired";
}

export interface UpsertRetryPolicyInput {
  enabled: boolean;
  strategy: CampaignRetryStrategy;
  maxAttempts: number;
  intervalHours: number;
  windowEndsAt?: Date | null;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  timezone?: string;
}

/** Read a campaign's retry policy. Absent means retries are off. */
export async function getCampaignRetryPolicy(campaignId: string, orgId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, team: { orgId } },
    select: { CampaignRetryPolicy: true },
  });
  if (!campaign) throw new CampaignNotFoundError();
  return campaign.CampaignRetryPolicy;
}

/**
 * Create or replace a campaign's retry policy.
 *
 * `windowEndsAt` is clamped to `MAX_RETRY_WINDOW_DAYS` here rather than only in
 * the zod schema, because a window is relative to *now* and a draft saved days
 * before launch would otherwise carry a date the schema accepted at the time.
 */
export async function upsertCampaignRetryPolicy(
  campaignId: string,
  orgId: string,
  input: UpsertRetryPolicyInput,
) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, team: { orgId } },
    select: { id: true },
  });
  if (!campaign) throw new CampaignNotFoundError();

  const latest = dayjs().add(MAX_RETRY_WINDOW_DAYS, "day").toDate();
  const windowEndsAt =
    input.windowEndsAt && input.windowEndsAt > latest ? latest : (input.windowEndsAt ?? null);

  const data = {
    enabled: input.enabled,
    strategy: input.strategy,
    maxAttempts: Math.min(Math.max(input.maxAttempts, 1), 3),
    intervalHours: Math.max(input.intervalHours, 1),
    windowEndsAt,
    quietHoursStart: input.quietHoursStart ?? null,
    quietHoursEnd: input.quietHoursEnd ?? null,
    timezone: input.timezone || "Etc/UTC",
  };

  return prisma.campaignRetryPolicy.upsert({
    where: { campaignId },
    create: { campaignId, ...data },
    update: data,
  });
}

/**
 * Cancel every retry that has not fired yet.
 *
 * Only `SCHEDULED` rows: a send already queuing or running has messages in
 * flight, and stopping that is what the dequeue path is for.
 */
export async function cancelPendingRetries(campaignId: string, orgId: string): Promise<number> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, team: { orgId } },
    select: { id: true },
  });
  if (!campaign) throw new CampaignNotFoundError();

  return cancelCampaignSends(campaignId, {
    onlyScheduled: true,
    note: "Pending retries cancelled by the campaign owner.",
  });
}
