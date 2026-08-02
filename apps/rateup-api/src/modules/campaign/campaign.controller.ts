import { FastifyRequest, FastifyReply } from "fastify";
import {
  ByCampaignIdParams,
  CreateCampaignInput,
  GetCampaignsQuery,
  SendCampaignInput,
  UpdateCampaignInput,
} from "./campaign.schema.js";
import { CampaignNotFoundError } from "./campaign.errors.js";
import {
  createCampaign,
  deleteCampaign,
  deleteCampaignParticipantsByCampaignId,
  enqueueCampaignMessage,
  getCampaginStatsById,
  getCampaignById,
  getCampaignFilterForFlows,
  getCampaignParticipantCountByStatuses,
  getCampaignsByOrgId,
  getCampaignsByTeamId,
  getResponseByCampaignById,
  getResponseExcelByCampaignById,
  updateCampaign,
} from "./campaign.service.js";
import { bySurveyIdSchema } from "../surveyTheme/surveyTheme.schema.js";
import { CampaignStatus, CampaignType, SentCampaignEnum } from "../../types/enums.js";
import { log } from "../../utils/logger.js";
import {
  getSpreadsheetContentType,
  getSpreadsheetFilename,
  spreadsheetExportFormatSchema,
  SpreadsheetExportFormat,
} from "../../utils/spreadsheet.js";

/**
 * Turns a service failure into a controlled reply.
 *
 * Ten of the sixteen handlers across the two campaign controllers had no
 * try/catch, so a service failure escaped to fastify's default error handler
 * rather than becoming a reply — inconsistent with sendCampaignHandler beside
 * them, which did catch. Three of the ones that did catch sent the caught Error
 * as the body, whose own properties are non-enumerable, so the client received
 * `{}`. See issues.txt 17.6.
 *
 * A CampaignNotFoundError becomes a 404: a campaign another org owns should be
 * indistinguishable from one that never existed. See issues.txt 17.3.
 */
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
    type,
    dailySendLimit,
  } = request.body;
  const { campaignId } = request.params;
  const { orgId } = request.user;

  try {
    // The campaign is resolved ONCE, up front, and every branch below works from
    // it. sendCampaignHandler used to fetch it only to read its status, and the
    // DRIP and INACTIVE branches never fetched it at all — so a campaign id was
    // enough to fire another org's campaign at their contacts, from their WhatsApp
    // number, on their bill. See issues.txt 17.3.
    const campaign = await getCampaignById(campaignId, orgId);
    if (!campaign) {
      return reply.status(404).send({ message: "Campaign not found", code: "CAMPAIGN_NOT_FOUND" });
    }

    // Above the INACTIVE branch, not below it. The guard sat after the cancel path,
    // so it could not protect it: an INACTIVE request marked the campaign DEQUEUING
    // and asked for the dequeue while a queue or dequeue was already running.
    // See issues.txt 17.6.
    const inProgressStatuses: string[] = [CampaignStatus.DEQUEUING, CampaignStatus.QUEUING];
    if (inProgressStatuses.includes(campaign.status)) {
      return reply.status(400).send({
        message: `Campaign ${campaign.status} is in progress, so no action can be performed at this time.`,
        code: "CAMPAIGN_ENQUEUE_DEQUEUE_IN_PROGRESS",
      });
    }

    if (type === CampaignType.DRIP) {
      if (!status) {
        return reply.status(400).send({
          message: "status is required to update a DRIP campaign",
          code: "STATUS_REQUIRED",
        });
      }
      await updateCampaign(campaignId, orgId, {
        status,
        campaignSentAt: null,
        scheduledStatuses: [],
        startedAt: new Date(),
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
    const count = await getCampaignParticipantCountByStatuses(campaignId, orgId, sendToStatuses);
    if (count === 0) {
      return reply.status(400).send({
        message: `No participants with the specified statuses to send the campaign to.`,
        code: "NO_PARTICIPANTS_FOR_CAMPAIGN",
      });
    }

    // A per-day cap spreads participants over consecutive days. The dispatcher
    // applies it when it fans the campaign out into per-participant jobs. A
    // single-participant resend is never throttled, so it ignores the cap.
    const effectiveDailySendLimit = participantId ? undefined : (dailySendLimit ?? undefined);

    if (campaignSentAt && sentCampaignChoice === SentCampaignEnum.LATER) {
      await updateCampaign(campaignId, orgId, {
        status: CampaignStatus.QUEUING,
        campaignSentAt,
        scheduledStatuses: [],
        dailySendLimit: dailySendLimit ?? null,
      });
      const scheduled = await enqueueCampaignMessage(
        campaignId,
        sendToStatuses,
        undefined,
        campaignSentAt,
        undefined,
        effectiveDailySendLimit,
      );
      if (!scheduled.status) return await reportEnqueueFailure(campaignId, orgId, reply, scheduled);
      return reply.status(200).send({
        message: "Campaign scheduling requested",
        code: "MSG_SCHEDULE_REQUESTED",
      });
    }
    await updateCampaign(campaignId, orgId, {
      status: CampaignStatus.QUEUING,
      campaignSentAt: null,
      scheduledStatuses: [],
      ...(participantId ? {} : { dailySendLimit: dailySendLimit ?? null }),
    });

    const enqueued = await enqueueCampaignMessage(
      campaignId,
      sendToStatuses,
      participantId,
      undefined,
      undefined,
      effectiveDailySendLimit,
    );
    if (!enqueued.status) return await reportEnqueueFailure(campaignId, orgId, reply, enqueued);
    return reply.status(200).send({
      message: "Campaign enqueue request accepted. Processing will occur asynchronously.",
      code: "ENQUEUE_REQUEST_ACCEPTED",
    });
  } catch (error) {
    return replyForError(reply, error, "Error while handling sendCampaignHandler");
  }
}

/**
 * The handler used to discard enqueueCampaignMessage's result entirely and answer
 * ENQUEUE_REQUEST_ACCEPTED regardless — while the campaign row was already marked
 * QUEUING, so the UI showed it queued forever. Rolling the status back is what
 * lets the user try again. See issues.txt 17.4.
 */
async function reportEnqueueFailure(
  campaignId: string,
  orgId: string,
  reply: FastifyReply,
  result: { status: boolean; message: string },
) {
  try {
    await updateCampaign(campaignId, orgId, { status: CampaignStatus.INACTIVE });
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
