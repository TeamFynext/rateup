import { FastifyRequest, FastifyReply } from "fastify";
import {
  ByCampaignIdParams,
  CreateCampaignInput,
  GetCampaignsQuery,
  SendCampaignInput,
  SendPreflightQuery,
  UpdateCampaignInput,
} from "./campaign.schema.js";
import { CampaignNotFoundError } from "./campaign.errors.js";
import { getCampaignSendPreflight } from "./campaign.preflight.js";
import { getDripSchedule } from "./campaignDrip.service.js";
import {
  createCampaign,
  deleteCampaign,
  deleteCampaignParticipantsByCampaignId,
  enqueueCampaignMessage,
  getCampaginStatsById,
  getCampaignById,
  getCampaignFilterForFlows,
  getCampaignsByOrgId,
  getCampaignsByTeamId,
  getResponseByCampaignById,
  getResponseExcelByCampaignById,
  updateCampaign,
} from "./campaign.service.js";
import { bySurveyIdSchema } from "../surveyTheme/surveyTheme.schema.js";
import {
  CampaignParticipantStatus,
  CampaignStatus,
  CampaignType,
  SentCampaignEnum,
} from "../../types/enums.js";
import {
  cancelCampaignSends,
  CampaignSendInProgressError,
  createCampaignSend,
  failCampaignSend,
  getLiveCampaignSend,
} from "./campaignSend.service.js";
import { CampaignSendTrigger } from "../../../generated/prisma/enums.js";
import { upsertCampaignRetryPolicy } from "./campaignRetry.service.js";
import { log } from "../../utils/logger.js";
import {
  getSpreadsheetContentType,
  getSpreadsheetFilename,
  spreadsheetExportFormatSchema,
  SpreadsheetExportFormat,
} from "../../utils/spreadsheet.js";

function replyForError(reply: FastifyReply, error: unknown, context: string) {
  if (error instanceof CampaignNotFoundError) {
    return reply.status(404).send({ message: error.message, code: "CAMPAIGN_NOT_FOUND" });
  }
  // Prisma raises P2025 when an extended `where` matched nothing — which, on this
  // module's writes, means the campaign is not the caller's.
  if (error && typeof error === "object" && (error as { code?: string }).code === "P2025") {
    return reply.status(404).send({ message: "Campaign not found", code: "CAMPAIGN_NOT_FOUND" });
  }
  log.error({ err: error }, context);
  return reply.status(500).send({
    message: error instanceof Error ? error.message : "Internal server error",
    code: "INTERNAL_SERVER_ERROR",
  });
}

export async function createCampaignHandler(
  request: FastifyRequest<{ Body: CreateCampaignInput }>,
  reply: FastifyReply,
) {
  try {
    const campaign = await createCampaign({ ...request.body }, request.user.orgId);
    return reply.status(201).send(campaign);
  } catch (error) {
    return replyForError(reply, error, "Error while creating a campaign");
  }
}

export async function getCampaignsHandler(
  request: FastifyRequest<{ Querystring: GetCampaignsQuery }>,
  reply: FastifyReply,
) {
  const { orgId } = request.user;
  try {
    if (request.query.campaignId) {
      const campaign = await getCampaignById(request.query.campaignId, orgId);
      if (!campaign) {
        return reply
          .status(404)
          .send({ message: "Campaign not found", code: "CAMPAIGN_NOT_FOUND" });
      }
      return reply.code(200).send(campaign);
    }
    if (request.query.teamId) {
      return reply.code(200).send(await getCampaignsByTeamId(request.query.teamId, orgId));
    }
    return reply.code(200).send(await getCampaignsByOrgId(orgId, request.query?.type));
  } catch (error) {
    return replyForError(reply, error, "Error while listing campaigns");
  }
}

export async function updateCampaignByIdHandler(
  request: FastifyRequest<{
    Params: ByCampaignIdParams;
    Body: UpdateCampaignInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const campaign = await updateCampaign(
      request.params.campaignId,
      request.user.orgId,
      request.body,
    );
    return reply.status(200).send(campaign);
  } catch (error) {
    return replyForError(reply, error, "Error while updating a campaign");
  }
}

export async function deleteCampaignByIdHandler(
  request: FastifyRequest<{ Params: ByCampaignIdParams }>,
  reply: FastifyReply,
) {
  try {
    const campaign = await deleteCampaign(request.params.campaignId, request.user.orgId);
    return reply.status(200).send(campaign);
  } catch (error) {
    return replyForError(reply, error, "Error while deleting a campaign");
  }
}

/**
 * What a campaign would cost against the conversation allowance, before it is sent.
 *
 * Read by the send dialog so a customer whose campaign outruns their allowance is told
 * while they can still act on it — trim the audience, buy a pack, or send anyway knowing
 * where it stops. Nothing is refused here; the send gate is still the thing that enforces.
 */
export async function getCampaignSendPreflightHandler(
  request: FastifyRequest<{
    Params: ByCampaignIdParams;
    Querystring: SendPreflightQuery;
  }>,
  reply: FastifyReply,
) {
  const { campaignId } = request.params;
  const { orgId } = request.user;

  try {
    const campaign = await getCampaignById(campaignId, orgId);
    if (!campaign) {
      return reply.status(404).send({ message: "Campaign not found", code: "CAMPAIGN_NOT_FOUND" });
    }

    return reply.send(
      await getCampaignSendPreflight(campaignId, orgId, request.query.sendToStatuses),
    );
  } catch (error) {
    return replyForError(reply, error, "Error while handling getCampaignSendPreflightHandler");
  }
}

/**
 * When each stage of a drip campaign next goes out.
 *
 * A drip books no send ahead of time, so the Overview's "next batch" card has
 * nothing to read for one — this is what it reads instead.
 */
export async function getDripScheduleHandler(
  request: FastifyRequest<{ Params: ByCampaignIdParams }>,
  reply: FastifyReply,
) {
  const { campaignId } = request.params;
  const { orgId } = request.user;

  try {
    const schedule = await getDripSchedule(campaignId, orgId);
    if (!schedule) {
      // Either no such campaign in this org, or not a drip. Both mean there is
      // no drip schedule to show, and neither is worth distinguishing to a
      // caller that only renders a card when one comes back.
      return reply
        .status(404)
        .send({ message: "No drip schedule for this campaign", code: "DRIP_SCHEDULE_NOT_FOUND" });
    }
    return reply.send(schedule);
  } catch (error) {
    return replyForError(reply, error, "Error while handling getDripScheduleHandler");
  }
}

/**
 * Why this campaign cannot be launched, or null if it can.
 *
 * A draft is deliberately allowed to be saved half-finished — that is what makes
 * the wizard resumable — so the checks the create schema used to run on every
 * campaign live here now, on the one path where an incomplete campaign would
 * actually produce broken sends.
 */
async function findIncompleteLaunchReason(
  campaignId: string,
  orgId: string,
): Promise<string | null> {
  const campaign = await getCampaignById(campaignId, orgId);
  if (!campaign) return null;

  if (campaign.type === CampaignType.DRIP) {
    return campaign.dripStages?.length
      ? null
      : "Add at least one drip stage before launching this campaign.";
  }
  return campaign.waTemplateId ? null : "Choose a template before launching this campaign.";
}

/**
 * How long a send may sit in a live state before the in-progress guard stops
 * believing it. Generously longer than any fan-out takes, and far shorter than a
 * customer's patience with a campaign that cannot even be cancelled.
 */
const STALE_SEND_MS = 30 * 60 * 1000;

/**
 * Open a send session, turning the database's "one live send per campaign" rule
 * into a 409 rather than an unhandled P2002.
 *
 * Returns null when it has already replied.
 */
async function openCampaignSend(input: {
  campaignId: string;
  orgId: string;
  reply: FastifyReply;
  trigger: CampaignSendTrigger;
  sendToStatuses: CampaignParticipantStatus[];
  scheduledFor?: Date;
}) {
  const { campaignId, orgId, reply, trigger, sendToStatuses, scheduledFor } = input;
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
    if (error instanceof CampaignSendInProgressError) {
      reply.status(409).send({
        message: "Another send for this campaign is already in progress.",
        code: "CAMPAIGN_SEND_IN_PROGRESS",
      });
      return null;
    }
    // A campaign that could not open a send has failed, not been paused.
    await updateCampaign(campaignId, orgId, {
      status: CampaignStatus.FAILED,
      errorMessage: "The send could not be started. Try sending it again.",
    }).catch(() => {});
    throw error;
  }
}

export async function sendCampaignHandler(
  request: FastifyRequest<{
    Params: ByCampaignIdParams;
    Body: SendCampaignInput;
  }>,
  reply: FastifyReply,
) {
  const {
    status,
    campaignSentAt,
    sentCampaignChoice,
    sendToStatuses,
    participantId,
    participantIds,
    type,
    dailySendLimit,
    retryPolicy,
  } = request.body;
  const { campaignId } = request.params;
  const { orgId } = request.user;

  try {
    const campaign = await getCampaignById(campaignId, orgId);
    if (!campaign) {
      return reply.status(404).send({ message: "Campaign not found", code: "CAMPAIGN_NOT_FOUND" });
    }

    // A campaign whose fan-out job was lost (worker restart, Redis eviction)
    // used to be stuck here forever: every further action was refused, including
    // cancelling it. The live send's age is the escape — once it has sat past
    // STALE_SEND_MS with nothing happening, the guard lets go.
    const inProgressStatuses: string[] = [CampaignStatus.DEQUEUING, CampaignStatus.QUEUING];
    if (inProgressStatuses.includes(campaign.status)) {
      const live = await getLiveCampaignSend(campaignId);
      const startedAt = live?.startedAt ?? live?.createdAt;
      const stale = !live || (startedAt ? Date.now() - startedAt.getTime() > STALE_SEND_MS : true);
      if (!stale) {
        return reply.status(400).send({
          message: `Campaign ${campaign.status} is in progress, so no action can be performed at this time.`,
          code: "CAMPAIGN_ENQUEUE_DEQUEUE_IN_PROGRESS",
        });
      }
      log.warn({ campaignId, campaignSendId: live?.id }, "Releasing a stale campaign send");
      await cancelCampaignSends(campaignId, { note: "Abandoned — the send never completed." });
    }

    if (type === CampaignType.DRIP) {
      if (!status) {
        return reply.status(400).send({
          message: "status is required to update a DRIP campaign",
          code: "STATUS_REQUIRED",
        });
      }

      // A drip has no re-send: the cron owns what goes out and when. This branch
      // used to ignore a scoped request's `participantId`/`sendToStatuses` and
      // fall through to the status update, so "Retry now" on one failed
      // recipient retried nobody and reported success — while the `startedAt`
      // reset below pushed every pending stage back by however long the campaign
      // had been running. Refusing is the honest answer.
      if (participantId || participantIds?.length) {
        return reply.status(400).send({
          message:
            "A drip campaign cannot re-send to specific recipients. Its stages are sent by schedule.",
          code: "DRIP_RESEND_UNSUPPORTED",
        });
      }

      // `startedAt` is the drip clock: every stage is due at
      // max(participantCreatedAt, startedAt) + delay. Stamping it on each call
      // restarted the whole sequence, so only an actual start may set it — a
      // pause must leave the campaign's place in the schedule alone.
      const isStarting =
        status === CampaignStatus.ACTIVE && campaign.status !== CampaignStatus.ACTIVE;

      await updateCampaign(campaignId, orgId, {
        status,
        campaignSentAt: null,
        scheduledStatuses: [],
        ...(isStarting ? { startedAt: new Date() } : {}),
      });
      return reply.status(200).send({
        message: `Campaign status updated to ${status}`,
        code: "MSG_SCHEDULED",
      });
    }
    if (status === CampaignStatus.INACTIVE) {
      await updateCampaign(campaignId, orgId, {
        status: CampaignStatus.DEQUEUING,
        campaignSentAt: null,
        scheduledStatuses: [],
      });
      const dequeue = await deleteCampaignParticipantsByCampaignId(campaignId);
      if (!dequeue.status) {
        return reply.status(502).send({
          message: dequeue.message,
          code: "MSG_SCHEDULE_CANCEL_FAILED",
        });
      }
      return reply.status(200).send({
        message: "Campaign schedule cancellation requested",
        code: "MSG_SCHEDULE_CANCEL_REQUESTED",
      });
    }
    // The completeness the create schema stops insisting on for a DRAFT is
    // enforced here instead, at the one moment it actually matters.
    const incomplete = await findIncompleteLaunchReason(campaignId, orgId);
    if (incomplete) {
      return reply.status(400).send({ message: incomplete, code: "CAMPAIGN_INCOMPLETE" });
    }

    // Saved before the send, so the policy is in place by the time the first
    // attempt drains and asks whether to schedule a retry.
    if (retryPolicy) {
      await upsertCampaignRetryPolicy(campaignId, orgId, retryPolicy);
    }

    // Named recipients are counted as themselves; see `getCampaignSendPreflight`.
    const cohort = participantId ? [participantId] : participantIds;
    const preflight = await getCampaignSendPreflight(campaignId, orgId, sendToStatuses, cohort);
    if (preflight.recipients === 0) {
      return reply.status(400).send({
        message: cohort?.length
          ? `Those recipients are no longer on this campaign.`
          : `No participants with the specified statuses to send the campaign to.`,
        code: "NO_PARTICIPANTS_FOR_CAMPAIGN",
      });
    }

    // Only the case where nothing at all could be delivered is refused. A campaign that
    // merely outruns the allowance still goes — the dialog has already said where it will
    // stop, and sending to as many people as the plan covers is a reasonable choice. But
    // starting one with nothing left only produces a queue of messages that each fail in
    // the dispatcher, a campaign stuck in QUEUING, and no explanation anywhere the sender
    // would look.
    if (preflight.exhausted) {
      return reply.status(403).send({
        message:
          `You have used all ${preflight.max?.toLocaleString()} conversations on your plan ` +
          `${preflight.isAnnual ? "this year" : "this month"}, so this campaign cannot be sent yet.`,
        code: "CONVERSATION_LIMIT_REACHED",
      });
    }

    // A per-day cap spreads participants over consecutive days. The dispatcher
    // applies it when it fans the campaign out into per-participant jobs. A
    // single-participant resend is never throttled, so it ignores the cap.
    const scopedResend = Boolean(participantId || participantIds?.length);
    const effectiveDailySendLimit = scopedResend ? undefined : (dailySendLimit ?? undefined);

    if (campaignSentAt && sentCampaignChoice === SentCampaignEnum.LATER) {
      await updateCampaign(campaignId, orgId, {
        status: CampaignStatus.QUEUING,
        campaignSentAt,
        scheduledStatuses: [],
        dailySendLimit: dailySendLimit ?? null,
        // Whatever went wrong last time is no longer what this campaign is doing.
        errorMessage: null,
      });
      const send = await openCampaignSend({
        campaignId,
        orgId,
        reply,
        trigger: CampaignSendTrigger.SCHEDULED,
        sendToStatuses,
        scheduledFor: new Date(campaignSentAt),
      });
      if (!send) return reply;

      const scheduled = await enqueueCampaignMessage({
        campaignId,
        campaignSendId: send.id,
        sendToStatuses,
        scheduledAt: campaignSentAt,
        dailySendLimit: effectiveDailySendLimit,
      });
      if (!scheduled.status) {
        await failCampaignSend(send.id, "Could not be queued.");
        return await reportEnqueueFailure(campaignId, orgId, reply, scheduled);
      }
      return reply.status(200).send({
        message: "Campaign scheduling requested",
        code: "MSG_SCHEDULE_REQUESTED",
      });
    }
    await updateCampaign(campaignId, orgId, {
      status: CampaignStatus.QUEUING,
      campaignSentAt: null,
      scheduledStatuses: [],
      errorMessage: null,
      // When the campaign first went out. The scheduled dispatcher has always
      // recorded this and the send-now path never did, so a campaign sent from
      // the button read "Sent — not yet" for the rest of its life:
      // `campaignSentAt` is deliberately nulled here (nothing is pending any
      // more) and nothing wrote the other half. `updateCampaign` only fills it
      // while it is null, so a resend or a single-recipient retry still reports
      // the first send rather than the latest one.
      startedAt: new Date(),
      ...(scopedResend ? {} : { dailySendLimit: dailySendLimit ?? null }),
    });

    const send = await openCampaignSend({
      campaignId,
      orgId,
      reply,
      trigger: CampaignSendTrigger.MANUAL,
      sendToStatuses,
    });
    if (!send) return reply;

    const enqueued = await enqueueCampaignMessage({
      campaignId,
      campaignSendId: send.id,
      sendToStatuses,
      participantId,
      participantIds,
      dailySendLimit: effectiveDailySendLimit,
    });
    if (!enqueued.status) {
      await failCampaignSend(send.id, "Could not be queued.");
      return await reportEnqueueFailure(campaignId, orgId, reply, enqueued);
    }
    return reply.status(200).send({
      message: "Campaign enqueue request accepted. Processing will occur asynchronously.",
      code: "ENQUEUE_REQUEST_ACCEPTED",
    });
  } catch (error) {
    return replyForError(reply, error, "Error while handling sendCampaignHandler");
  }
}

async function reportEnqueueFailure(
  campaignId: string,
  orgId: string,
  reply: FastifyReply,
  result: { status: boolean; message: string },
) {
  try {
    await updateCampaign(campaignId, orgId, {
      status: CampaignStatus.FAILED,
      errorMessage: result.message,
    });
  } catch (error) {
    log.error({ err: error, campaignId }, "Could not roll a campaign back after a failed enqueue");
  }
  return reply.status(502).send({ message: result.message, code: "ENQUEUE_FAILED" });
}

export async function getCampaignFilterForFlowsHandler(
  request: FastifyRequest<{ Querystring: bySurveyIdSchema }>,
  reply: FastifyReply,
) {
  if (!request.query.surveyId) {
    return reply.status(400).send("surveyId is required");
  }
  const result = await getCampaignFilterForFlows(request.query.surveyId, request.user.orgId);
  return reply.status(200).send(result);
}

export async function getResponseByCampaignByIdHandler(
  request: FastifyRequest<{
    Params: ByCampaignIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const res = await getResponseByCampaignById(request.params.campaignId, request.user.orgId);
    return reply.status(200).send(res);
  } catch (error) {
    return replyForError(reply, error, "Error while handling getResponseByCampaignById");
  }
}

export async function getResponseExcelByCampaignByIdHandler(
  request: FastifyRequest<{
    Params: ByCampaignIdParams;
    Querystring: { selectedDripStage?: string; format?: SpreadsheetExportFormat };
  }>,
  reply: FastifyReply,
) {
  try {
    const parsedFormat = spreadsheetExportFormatSchema.safeParse(request.query.format ?? "xlsx");
    if (!parsedFormat.success) {
      return reply.code(400).send({ error: 'Invalid export format. Use "xlsx" or "ods".' });
    }
    const format = parsedFormat.data;
    const { title, data } = await getResponseExcelByCampaignById(
      request.params.campaignId,
      request.user.orgId,
      request.query.selectedDripStage,
      format,
    );
    reply.header("filename", `${encodeURIComponent(getSpreadsheetFilename(title, format))}`);
    reply.header("Access-Control-Expose-Headers", "filename");
    reply.status(200).type(getSpreadsheetContentType(format)).send(data);
  } catch (error) {
    return replyForError(reply, error, "Error while handling getResponseExcelByCampaignById");
  }
}

export async function getCampaignStatsHandler(
  request: FastifyRequest<{
    Params: ByCampaignIdParams;
    Querystring: { selectedDripStage?: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const stats = await getCampaginStatsById(
      request.params.campaignId,
      request.user.orgId,
      request.query.selectedDripStage,
    );
    reply.code(200).send(stats);
  } catch (e) {
    return replyForError(reply, e, "Error in getting campain stats");
  }
}
