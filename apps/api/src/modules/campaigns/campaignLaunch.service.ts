import type { CampaignSend } from "../../generated/prisma/client.js";
import { CampaignSendTrigger } from "../../generated/prisma/enums.js";
import { CampaignParticipantStatus, CampaignStatus, CampaignType } from "../../types/enums.js";
import { log } from "../../utils/logger.js";
import { getCampaignCreditBudget } from "../settings/subscription/campaignCredits.js";
import {
  CampaignBusyError,
  CampaignCreditsExhaustedError,
  CampaignDequeueFailedError,
  CampaignEnqueueFailedError,
  CampaignIncompleteError,
  CampaignNoRecipientsError,
  CampaignStatusNotAllowedError,
  CampaignStatusRequiredError,
  DripResendUnsupportedError,
} from "./campaign.errors.js";
import { getCampaignSendPreflight } from "./campaign.preflight.js";
import {
  deleteCampaignParticipantsByCampaignId,
  enqueueCampaignMessage,
  updateCampaign,
} from "./campaign.service.js";
import { clearCampaignPause } from "./campaignPause.service.js";
import { upsertCampaignRetryPolicy, type UpsertRetryPolicyInput } from "./campaignRetry.service.js";
import {
  cancelCampaignSends,
  CampaignSendInProgressError,
  createCampaignSend,
  failCampaignSend,
  getLiveCampaignSend,
} from "./campaignSend.service.js";

/**
 * The one launch path behind "send this campaign" — the dashboard's
 * `sendCampaignHandler` and the partner API's `sendCampaignForOrg` both call
 * `launchCampaign` and only translate its result and refusals to their own wire
 * shapes. A rule about launching belongs here, not in either adapter, or the two
 * drift.
 *
 * Refusals are thrown as the typed errors in `campaign.errors.ts`, plus
 * `CampaignSendInProgressError` (from `campaignSend.service.ts`) when another send
 * already holds the campaign's lane. Anything else is an unexpected failure.
 */

/**
 * How long a send may sit in a live state before the in-progress guard stops
 * believing it. Generously longer than any fan-out takes, and far shorter than a
 * customer's patience with a campaign that cannot even be cancelled.
 */
export const STALE_SEND_MS = 30 * 60 * 1000;

/**
 * What the launch needs to know about the campaign. The caller loads it, because
 * each surface resolves "is this the caller's campaign" its own way (and answers a
 * miss with its own 404); a campaign reaching here is already known to be the org's.
 */
export interface LaunchableCampaign {
  id: string;
  type?: string | null;
  status: string;
  waTemplateId?: string | null;
  dripStageCount: number;
}

export interface LaunchCampaignInput {
  orgId: string;
  campaign: LaunchableCampaign;
  /**
   * Which branch to take. The partner API derives it from `campaign.type`; the
   * dashboard from the `type` its client sends, as it always has.
   */
  mode: "broadcast" | "drip";
  /**
   * The status asked for. PAUSED is always refused. For a drip it is the status to
   * set (required); for a broadcast INACTIVE means stop, anything else means send.
   */
  status?: CampaignStatus | null;
  /** Participant statuses to (re)send to. Ignored for a drip. */
  sendToStatuses: CampaignParticipantStatus[];
  /** Send at this time instead of now (trigger SCHEDULED rather than MANUAL). */
  scheduledAt?: Date;
  /** Per-day cap. Ignored by the fan-out for a scoped resend. */
  dailySendLimit?: number | null;
  /** A scoped resend: one recipient. */
  participantId?: string;
  /** A scoped resend: an exact cohort. */
  participantIds?: string[];
  /** Saved before anything is queued, so the first attempt's drain sees it. */
  retryPolicy?: UpsertRetryPolicyInput;
  /**
   * Refuse to switch a drip ACTIVE while it has no stages. The partner API sets it;
   * the dashboard's drip toggle has never checked, and still does not.
   */
  requireDripStages?: boolean;
}

export type LaunchCampaignResult =
  /** A drip's status was set; the cron owns what goes out and when. */
  | { outcome: "drip_status_set"; status: CampaignStatus }
  /** A broadcast was stopped; its pending messages are being dequeued. */
  | { outcome: "stop_requested" }
  /** A broadcast send was opened and its fan-out queued. */
  | { outcome: "queued"; scheduled: boolean; send: CampaignSend };

export async function launchCampaign(input: LaunchCampaignInput): Promise<LaunchCampaignResult> {
  const { orgId, campaign, mode, status } = input;

  await releaseStaleSend(campaign);

  // Only the platform pauses a campaign this way, and only with a reason.
  if (status === CampaignStatus.PAUSED) {
    throw new CampaignStatusNotAllowedError(status);
  }

  if (mode === "drip") {
    return setDripStatus(input);
  }

  if (status === CampaignStatus.INACTIVE) {
    await updateCampaign(campaign.id, orgId, {
      status: CampaignStatus.DEQUEUING,
      campaignSentAt: null,
      scheduledStatuses: [],
    });
    await clearCampaignPause(campaign.id);
    const dequeue = await deleteCampaignParticipantsByCampaignId(campaign.id);
    if (!dequeue.status) throw new CampaignDequeueFailedError(dequeue.message);
    return { outcome: "stop_requested" };
  }

  return sendBroadcast(input);
}

/**
 * A fan-out in flight owns the campaign. A campaign whose fan-out job was lost
 * (worker restart, Redis eviction) used to be stuck here forever: every further
 * action was refused, including cancelling it. The live send's age is the escape —
 * once it has sat past STALE_SEND_MS with nothing happening, the guard lets go.
 */
async function releaseStaleSend(campaign: LaunchableCampaign) {
  const inProgressStatuses: string[] = [CampaignStatus.DEQUEUING, CampaignStatus.QUEUING];
  if (!inProgressStatuses.includes(campaign.status)) return;

  const live = await getLiveCampaignSend(campaign.id);
  const startedAt = live?.startedAt ?? live?.createdAt;
  const stale = !live || (startedAt ? Date.now() - startedAt.getTime() > STALE_SEND_MS : true);
  if (!stale) throw new CampaignBusyError(campaign.status);

  log.warn(
    { campaignId: campaign.id, campaignSendId: live?.id },
    "Releasing a stale campaign send",
  );
  await cancelCampaignSends(campaign.id, { note: "Abandoned — the send never completed." });
}

async function setDripStatus(input: LaunchCampaignInput): Promise<LaunchCampaignResult> {
  const { orgId, campaign, status, participantId, participantIds, requireDripStages } = input;
  if (!status) throw new CampaignStatusRequiredError();

  // A drip has no re-send: the cron owns what goes out and when. This branch used
  // to ignore a scoped request and fall through to the status update, so "Retry
  // now" on one failed recipient retried nobody and reported success — while the
  // `startedAt` reset below pushed every pending stage back. Refusing is the
  // honest answer.
  if (participantId || participantIds?.length) {
    throw new DripResendUnsupportedError();
  }

  if (requireDripStages && status === CampaignStatus.ACTIVE && campaign.dripStageCount === 0) {
    throw new CampaignIncompleteError("no_drip_stages");
  }

  // `startedAt` is the drip clock: every stage is due at
  // max(participantCreatedAt, startedAt) + delay. Stamping it on each call
  // restarted the whole sequence, so only an actual start may set it — a pause
  // must leave the campaign's place in the schedule alone.
  //
  // Resuming from PAUSED is not a start either: the platform stopped it
  // mid-sequence, and restarting the clock would re-time every stage.
  const isStarting =
    status === CampaignStatus.ACTIVE &&
    campaign.status !== CampaignStatus.ACTIVE &&
    campaign.status !== CampaignStatus.PAUSED;

  // A drip resumes without a preflight, so credits that are still spent have to be
  // caught here — otherwise the cron's next tick pauses it again and the resume
  // looks like it did nothing.
  if (
    status === CampaignStatus.ACTIVE &&
    campaign.status === CampaignStatus.PAUSED &&
    (await getCampaignCreditBudget(orgId)).exhausted
  ) {
    throw new CampaignCreditsExhaustedError(true);
  }

  await updateCampaign(campaign.id, orgId, {
    status,
    campaignSentAt: null,
    scheduledStatuses: [],
    ...(isStarting ? { startedAt: new Date() } : {}),
  });
  await clearCampaignPause(campaign.id);
  return { outcome: "drip_status_set", status };
}

/**
 * Why this campaign cannot be launched, or null if it can.
 *
 * A draft is deliberately allowed to be saved half-finished — that is what makes
 * the wizard resumable — so the completeness checks live here, on the one path
 * where an incomplete campaign would actually produce broken sends.
 */
function incompleteReason(campaign: LaunchableCampaign) {
  if (campaign.type === CampaignType.DRIP) {
    return campaign.dripStageCount > 0 ? null : ("no_drip_stages" as const);
  }
  return campaign.waTemplateId ? null : ("no_template" as const);
}

async function sendBroadcast(input: LaunchCampaignInput): Promise<LaunchCampaignResult> {
  const {
    orgId,
    campaign,
    sendToStatuses,
    scheduledAt,
    dailySendLimit,
    participantId,
    participantIds,
    retryPolicy,
  } = input;
  const campaignId = campaign.id;

  const incomplete = incompleteReason(campaign);
  if (incomplete) throw new CampaignIncompleteError(incomplete);

  // Saved before the send, so the policy is in place by the time the first
  // attempt drains and asks whether to schedule a retry.
  if (retryPolicy) {
    await upsertCampaignRetryPolicy(campaignId, orgId, retryPolicy);
  }

  // Named recipients are counted as themselves; see `getCampaignSendPreflight`.
  const cohort = participantId ? [participantId] : participantIds;
  const preflight = await getCampaignSendPreflight(campaignId, orgId, sendToStatuses, cohort);
  if (preflight.recipients === 0) {
    throw new CampaignNoRecipientsError(Boolean(cohort?.length));
  }

  // Only the case where nothing at all could be sent is refused. A campaign that
  // merely outruns the credits still goes — the dialog has already said where it
  // will stop, and sending to as many people as the plan covers is a reasonable
  // choice. But starting one with nothing left only produces a queue of messages
  // that each fail in the dispatcher, a campaign stuck in QUEUING, and no
  // explanation anywhere the sender would look.
  if (preflight.exhausted) throw new CampaignCreditsExhaustedError(false);

  // Sending again is the resume: whatever paused it is no longer what it is doing.
  await clearCampaignPause(campaignId);

  // A per-day cap spreads participants over consecutive days. The dispatcher
  // applies it when it fans the campaign out into per-participant jobs. A scoped
  // resend is never throttled, so it ignores the cap.
  const scopedResend = Boolean(participantId || participantIds?.length);
  const effectiveDailySendLimit = scopedResend ? undefined : (dailySendLimit ?? undefined);

  if (scheduledAt) {
    await updateCampaign(campaignId, orgId, {
      status: CampaignStatus.QUEUING,
      campaignSentAt: scheduledAt,
      scheduledStatuses: [],
      dailySendLimit: dailySendLimit ?? null,
      // Whatever went wrong last time is no longer what this campaign is doing.
      errorMessage: null,
    });
    const send = await openSend({
      campaignId,
      orgId,
      trigger: CampaignSendTrigger.SCHEDULED,
      sendToStatuses,
      scheduledFor: new Date(scheduledAt),
    });
    // A scheduled send has always gone to the statuses, never to named recipients.
    const scheduled = await enqueueCampaignMessage({
      campaignId,
      campaignSendId: send.id,
      sendToStatuses,
      scheduledAt,
      dailySendLimit: effectiveDailySendLimit,
    });
    if (!scheduled.status) await failEnqueue(campaignId, orgId, send.id, scheduled.message);
    return { outcome: "queued", scheduled: true, send };
  }

  await updateCampaign(campaignId, orgId, {
    status: CampaignStatus.QUEUING,
    campaignSentAt: null,
    scheduledStatuses: [],
    errorMessage: null,
    // When the campaign first went out. `campaignSentAt` is deliberately nulled
    // here (nothing is pending any more), so without this a campaign sent from the
    // button read "Sent — not yet" for the rest of its life. `updateCampaign` only
    // fills it while it is null, so a resend or a single-recipient retry still
    // reports the first send rather than the latest one.
    startedAt: new Date(),
    ...(scopedResend ? {} : { dailySendLimit: dailySendLimit ?? null }),
  });

  const send = await openSend({
    campaignId,
    orgId,
    trigger: CampaignSendTrigger.MANUAL,
    sendToStatuses,
  });

  const enqueued = await enqueueCampaignMessage({
    campaignId,
    campaignSendId: send.id,
    sendToStatuses,
    participantId,
    participantIds,
    dailySendLimit: effectiveDailySendLimit,
  });
  if (!enqueued.status) await failEnqueue(campaignId, orgId, send.id, enqueued.message);
  return { outcome: "queued", scheduled: false, send };
}

/**
 * Open the send session every message of this send belongs to (AGENTS.md
 * "Campaign send sessions"). The database's "one live send per campaign" rule
 * surfaces as `CampaignSendInProgressError`, rethrown for the caller to answer.
 */
async function openSend(input: {
  campaignId: string;
  orgId: string;
  trigger: CampaignSendTrigger;
  sendToStatuses: CampaignParticipantStatus[];
  scheduledFor?: Date;
}) {
  const { campaignId, orgId, trigger, sendToStatuses, scheduledFor } = input;
  // A manual send takes the lane back from a pending automatic retry: the person
  // clicking Send is a stronger signal than a schedule set days ago.
  await cancelCampaignSends(campaignId, {
    onlyScheduled: true,
    note: "Superseded by a manual send.",
  });

  try {
    return await createCampaignSend({
      campaignId,
      trigger,
      targetStatuses: sendToStatuses,
      scheduledFor: scheduledFor ?? null,
    });
  } catch (error) {
    if (error instanceof CampaignSendInProgressError) throw error;
    // A campaign that could not open a send has failed, not been paused.
    await updateCampaign(campaignId, orgId, {
      status: CampaignStatus.FAILED,
      errorMessage: "The send could not be started. Try sending it again.",
    }).catch(() => {});
    throw error;
  }
}

/** Close the send that could not be queued, mark the campaign FAILED, and refuse. */
async function failEnqueue(
  campaignId: string,
  orgId: string,
  sendId: string,
  message: string,
): Promise<never> {
  await failCampaignSend(sendId, "Could not be queued.");
  try {
    await updateCampaign(campaignId, orgId, {
      status: CampaignStatus.FAILED,
      errorMessage: message,
    });
  } catch (error) {
    log.error({ err: error, campaignId }, "Could not roll a campaign back after a failed enqueue");
  }
  throw new CampaignEnqueueFailedError(message);
}
