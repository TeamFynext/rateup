import dayjs from "dayjs";

import prisma from "../../utils/prisma.js";
import {
  armCampaignRetry,
  campaignRetryFire,
  campaignRetryJobId,
} from "../../workers/bullmq/queues/campaignRetry.queue.js";
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
import {
  countInFlightParticipants,
  countUnresolvedSendMessages,
  getRetryCohort,
} from "./campaignRetryCohort.js";
import {
  MAX_RETRY_WINDOW_DAYS,
  MINIMUM_SETTLE_MINUTES,
  nextAttemptAt,
  shiftOutOfQuietHours,
} from "./campaignRetry.schedule.js";

// Re-exported: the schedule math lives in its own module so it can be reasoned
// about without a database, but this is still where callers expect to find it.
export { MAX_RETRY_WINDOW_DAYS, nextAttemptAt, shiftOutOfQuietHours };

// Re-exported: the cohort query lives in its own module so the settle pass can
// use it without a cycle, but this is still where callers expect to find it.
export { getRetryCohort };
import { enqueueCampaignMessage } from "./campaign.service.js";
import { finishCampaignIfSettled } from "./campaignSettle.service.js";

/**
 * The automatic retry engine.
 *
 * A `CampaignSend` in `SCHEDULED` remains the source of truth for *what* is
 * scheduled: cancelling a pending retry is an UPDATE, and the UI renders "next
 * attempt in 3h" by reading the row rather than scanning a queue. *When* a row
 * fires is owned by a delayed BullMQ job per row, which is what lets a retry go
 * off at its exact `scheduledFor` instead of at the next tick of a sweep.
 *
 * The cost of that split is that Redis can lose a job the database still expects
 * — `reconcileScheduledCampaignSends` at worker startup is what covers it.
 */

/**
 * The current retry cycle: how much of the budget is spent, and what it counts from.
 *
 * `attemptNo` is the row's position in the campaign, not a retry count, so using
 * it as one made every send a person asked for eat the retry budget: a campaign
 * resent once, or paused and resumed, had `maxAttempts` of 3 but got two retries
 * — and the ones it did get were labelled "Retry 2" and "Retry 3". The budget
 * belongs to the cycle: the run of automatic attempts since the last MANUAL,
 * SCHEDULED or DRIP send.
 *
 * Cancelled retries do not count. One that cancelled itself for want of anything
 * to retry never sent a message, and charging the customer's policy for it would
 * be charging them for our own decision not to send.
 *
 * The `anchor` is when that cycle-start send drained, and it is what a SMART
 * schedule divides its window from. Anchoring on the cycle rather than on the
 * send that just finished is what makes the offsets absolute: attempt 3 sits at
 * the end of the window because the window is measured from the same point every
 * time, not three drains deep from wherever the last one happened to land.
 */
async function getRetryCycle(
  campaignId: string,
  throughAttemptNo: number,
  fallbackAnchor: Date,
): Promise<{ retries: number; anchor: Date }> {
  const cycleStart = await prisma.campaignSend.findFirst({
    where: {
      campaignId,
      attemptNo: { lte: throughAttemptNo },
      trigger: { not: CampaignSendTrigger.AUTO_RETRY },
    },
    orderBy: { attemptNo: "desc" },
    select: { attemptNo: true, completedAt: true, startedAt: true, createdAt: true },
  });

  const retries = await prisma.campaignSend.count({
    where: {
      campaignId,
      trigger: CampaignSendTrigger.AUTO_RETRY,
      status: { not: CampaignSendStatus.CANCELLED },
      attemptNo: { gt: cycleStart?.attemptNo ?? -1, lte: throughAttemptNo },
    },
  });

  // A cycle start that has not drained yet is the send we are reacting to, so
  // its own completion is the honest anchor; `createdAt` covers a row that never
  // recorded one at all.
  const anchor =
    cycleStart?.completedAt ?? cycleStart?.startedAt ?? cycleStart?.createdAt ?? fallbackAnchor;
  return { retries, anchor };
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

    const now = new Date();
    const drainedAt = send.completedAt ?? now;
    const cycle = await getRetryCycle(send.campaignId, send.attemptNo, drainedAt);
    const nextAttemptNo = cycle.retries + 1;
    if (nextAttemptNo > policy.maxAttempts) {
      log.info({ campaignSendId }, "Retry attempts exhausted");
      return null;
    }

    let scheduledFor = nextAttemptAt(policy, nextAttemptNo, cycle.anchor, drainedAt);

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
    // "not yet", not "never". The exception is when nothing is still in flight:
    // once every message has reached a terminal status, no webhook can turn one
    // into a failure, and the only honest cohort is the one we can see.
    // Scheduling anyway parked the campaign on RETRYING for the whole window and
    // then cancelled the send the moment it came due.
    //
    // "In flight" has two halves, and the second one is not optional. A retry
    // re-attempts participants that are FAILED and does not reset them, so while
    // it runs no participant reads PENDING or SENT — the send's own freshly
    // dispatched messages are the only evidence the campaign is mid-attempt.
    // Counting participants alone, a retry drained, looked settled, and ended the
    // chain at attempt 1 of 3 with recipients still to try.
    const inFlight = await countInFlightParticipants(send.campaignId);
    const unresolved = inFlight > 0 ? 0 : await countUnresolvedSendMessages(send.id);
    if (
      inFlight === 0 &&
      unresolved === 0 &&
      (await getRetryCohort(send.campaignId)).length === 0
    ) {
      log.info({ campaignSendId }, "Nothing left to retry — no attempt scheduled");
      return null;
    }

    const scheduled = await createCampaignSend({
      campaignId: send.campaignId,
      trigger: CampaignSendTrigger.AUTO_RETRY,
      targetStatuses: [CampaignParticipantStatus.FAILED],
      status: CampaignSendStatus.SCHEDULED,
      scheduledFor,
      note: `Automatic retry ${nextAttemptNo} of ${policy.maxAttempts}.`,
    });

    // Armed after the row exists, never before: a job that fires against a row
    // that is not there yet claims nothing and is gone. If arming throws, the
    // row still stands and startup reconciliation will pick it up.
    await armCampaignRetry(scheduled.id, scheduledFor);
    return scheduled;
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
 * Fire one scheduled send, if it is still due to fire.
 *
 * Driven by a delayed job per row (see `queues/campaignRetry.queue.ts`), so this
 * is called once per scheduled retry at its own `scheduledFor` rather than by a
 * sweep. Everything that made the sweep safe still applies here, because a
 * delayed job is not a guarantee of exactly-once delivery: the claim is a
 * conditional UPDATE, so a row already cancelled, already claimed, or somehow
 * fired early is left alone and the job becomes a no-op.
 */
export async function fireCampaignSendById(
  campaignSendId: string,
): Promise<"fired" | "cancelled" | "skipped"> {
  const claimed = await prisma.$queryRaw<{ id: string; campaignId: string; attemptNo: number }[]>`
    UPDATE "CampaignSend"
    SET status = 'QUEUING'::"CampaignSendStatus"
    WHERE id = ${campaignSendId}::uuid
      AND status = 'SCHEDULED'::"CampaignSendStatus"
      -- 'scheduledFor' is 'timestamp without time zone' holding UTC (what Prisma
      -- writes), while now() is a timestamptz. Comparing the two casts now() to
      -- the *server's* local zone, so on any deployment east of UTC a row would
      -- look due before it is. Compare in UTC, the zone the column is in.
      AND "scheduledFor" <= (now() AT TIME ZONE 'utc')
    RETURNING id, "campaignId", "attemptNo"
  `;

  const send = claimed[0];
  if (!send) return "skipped";

  try {
    return await fireScheduledSend(send);
  } catch (error) {
    log.error({ err: error, campaignSendId }, "Failed to fire a scheduled campaign send");
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
    return "skipped";
  }
}

/**
 * Re-arm every scheduled send that has no delayed job waiting for it.
 *
 * The price of moving the trigger into Redis: a flushed Redis, a queue drained
 * by hand, or a row written while Redis was unreachable leaves a SCHEDULED row
 * that nothing will ever look at. Without a sweep to catch those, they would sit
 * forever and park the campaign on RETRYING.
 *
 * Run at worker startup, which is also when a Redis that lost its jobs is most
 * likely to have just come back. Arming is idempotent — the job id is derived
 * from the send id — so re-arming a row that already has a job is a no-op, and
 * a row that came due while the worker was down is armed with a zero delay and
 * runs immediately.
 */
export async function reconcileScheduledCampaignSends(): Promise<{
  checked: number;
  armed: number;
}> {
  const scheduled = await prisma.campaignSend.findMany({
    where: { status: CampaignSendStatus.SCHEDULED },
    select: { id: true, scheduledFor: true },
  });

  let armed = 0;
  for (const send of scheduled) {
    if (!send.scheduledFor) continue;
    const existing = await campaignRetryFire.getJob(campaignRetryJobId(send.id));
    if (existing) continue;
    await armCampaignRetry(send.id, send.scheduledFor);
    armed++;
  }

  if (armed) log.warn({ armed }, "Re-armed scheduled campaign sends with no delayed job");
  return { checked: scheduled.length, armed };
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
