import { ForbiddenError } from "../../authz/errors.js";
import { FastifyRequest, FastifyReply } from "fastify";
import {
  ByCampaignIdParams,
  CreateCampaignInput,
  GetCampaignsQuery,
  SendCampaignInput,
  SendPreflightQuery,
  UpdateCampaignInput,
} from "./campaign.schema.js";
import {
  CampaignBusyError,
  CampaignCreditsExhaustedError,
  CampaignDequeueFailedError,
  CampaignEnqueueFailedError,
  CampaignIncompleteError,
  CampaignNoRecipientsError,
  CampaignNotFoundError,
  CampaignStatusNotAllowedError,
  CampaignStatusRequiredError,
  DripResendUnsupportedError,
} from "./campaign.errors.js";
import { getCampaignSendPreflight } from "./campaign.preflight.js";
import { getDripSchedule } from "./campaignDrip.service.js";
import { launchCampaign } from "./campaignLaunch.service.js";
import {
  createCampaign,
  deleteCampaign,
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
import { CampaignType, SentCampaignEnum } from "../../types/enums.js";
import { CampaignSendInProgressError } from "./campaignSend.service.js";
import { log } from "../../utils/logger.js";
import {
  getSpreadsheetContentType,
  getSpreadsheetFilename,
  spreadsheetExportFormatSchema,
  SpreadsheetExportFormat,
} from "../../utils/spreadsheet.js";

function replyForError(reply: FastifyReply, error: unknown, context: string) {
  if (error instanceof ForbiddenError) {
    return reply.status(error.statusCode).send(error.toBody());
  }
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
    const campaign = await createCampaign({ ...request.body }, request.user.orgId, request.actor!);
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
    return reply.code(200).send(await getCampaignsByOrgId(orgId, request.query.type));
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
 * Maps a refusal from `launchCampaign` to the reply this endpoint has always sent
 * for it. Returns null for anything that is not a launch refusal.
 */
function replyForLaunchError(reply: FastifyReply, error: unknown) {
  const refuse = (status: number, code: string, message: string) =>
    reply.status(status).send({ message, code });

  if (error instanceof CampaignBusyError) {
    return refuse(400, "CAMPAIGN_ENQUEUE_DEQUEUE_IN_PROGRESS", error.message);
  }
  if (error instanceof CampaignStatusNotAllowedError) {
    return refuse(400, "INVALID_CAMPAIGN_STATUS", error.message);
  }
  if (error instanceof CampaignStatusRequiredError) {
    return refuse(400, "STATUS_REQUIRED", error.message);
  }
  if (error instanceof DripResendUnsupportedError) {
    return refuse(400, "DRIP_RESEND_UNSUPPORTED", error.message);
  }
  if (error instanceof CampaignIncompleteError) {
    return refuse(400, "CAMPAIGN_INCOMPLETE", error.message);
  }
  if (error instanceof CampaignNoRecipientsError) {
    return refuse(400, "NO_PARTICIPANTS_FOR_CAMPAIGN", error.message);
  }
  if (error instanceof CampaignCreditsExhaustedError) {
    return refuse(403, "CAMPAIGN_CREDITS_EXHAUSTED", error.message);
  }
  if (error instanceof CampaignSendInProgressError) {
    return refuse(
      409,
      "CAMPAIGN_SEND_IN_PROGRESS",
      "Another send for this campaign is already in progress.",
    );
  }
  if (error instanceof CampaignDequeueFailedError) {
    return refuse(502, "MSG_SCHEDULE_CANCEL_FAILED", error.message);
  }
  if (error instanceof CampaignEnqueueFailedError) {
    return refuse(502, "ENQUEUE_FAILED", error.message);
  }
  return null;
}

/**
 * Launch, stop, or flip a drip — the dashboard's adapter over `launchCampaign`
 * (campaignLaunch.service.ts), which the partner API's send shares. Only the
 * request parsing and the reply shapes live here.
 */
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

    const result = await launchCampaign({
      orgId,
      campaign: {
        id: campaignId,
        type: campaign.type,
        status: campaign.status,
        waTemplateId: campaign.waTemplateId,
        dripStageCount: campaign.dripStages?.length ?? 0,
      },
      // The branch follows the type the client sends, as it always has here.
      mode: type === CampaignType.DRIP ? "drip" : "broadcast",
      status,
      sendToStatuses,
      scheduledAt:
        campaignSentAt && sentCampaignChoice === SentCampaignEnum.LATER
          ? campaignSentAt
          : undefined,
      dailySendLimit,
      participantId,
      participantIds,
      retryPolicy,
    });

    switch (result.outcome) {
      case "drip_status_set":
        return reply.status(200).send({
          message: `Campaign status updated to ${result.status}`,
          code: "MSG_SCHEDULED",
        });
      case "stop_requested":
        return reply.status(200).send({
          message: "Campaign schedule cancellation requested",
          code: "MSG_SCHEDULE_CANCEL_REQUESTED",
        });
      case "queued":
        return result.scheduled
          ? reply.status(200).send({
              message: "Campaign scheduling requested",
              code: "MSG_SCHEDULE_REQUESTED",
            })
          : reply.status(200).send({
              message: "Campaign enqueue request accepted. Processing will occur asynchronously.",
              code: "ENQUEUE_REQUEST_ACCEPTED",
            });
    }
  } catch (error) {
    return (
      replyForLaunchError(reply, error) ??
      replyForError(reply, error, "Error while handling sendCampaignHandler")
    );
  }
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
