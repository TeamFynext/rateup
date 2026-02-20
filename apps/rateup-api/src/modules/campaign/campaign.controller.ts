import { FastifyRequest, FastifyReply } from "fastify";
import {
  ByCampaignIdParams,
  CreateCampaignInput,
  GetCampaignsQuery,
  SendCampaignInput,
  UpdateCampaignInput,
} from "./campaign.schema.js";
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
import { getDbTemplate } from "../whatsapp/messageTemplates/wa_templates.service.js";
import { bySurveyIdSchema } from "../surveyTheme/surveyTheme.schema.js";
import {
  CampaignStatus,
  CampaignType,
  SentCampaignEnum,
} from "../../types/enums.js";
import { log } from "../../utils/logger.js";
import prisma from "../../utils/prisma.js";

export async function createCampaignHandler(
  request: FastifyRequest<{ Body: CreateCampaignInput }>,
  reply: FastifyReply,
) {
  const campaign = await createCampaign({
    ...request.body,
  });
  return reply.status(201).send(campaign);
}

export async function getCampaignsHandler(
  request: FastifyRequest<{ Querystring: GetCampaignsQuery }>,
  reply: FastifyReply,
) {
  let res = null;
  if (request.query.campaignId) {
    // get individual contact group by id
    res = await getCampaignById(request.query.campaignId);
  } else if (request.query.teamId) {
    // get all contact groups for a specific team
    res = await getCampaignsByTeamId(request.query.teamId);
  } else {
    // get all contact groups for all teams
    res = await getCampaignsByOrgId(request.user.orgId, request.query?.type);
  }
  return reply.code(200).send(res);
}

export async function updateCampaignByIdHandler(
  request: FastifyRequest<{
    Params: ByCampaignIdParams;
    Body: UpdateCampaignInput;
  }>,
  reply: FastifyReply,
) {
  const campaign = await updateCampaign(
    request.params.campaignId,
    request.body,
  );
  return reply.status(200).send(campaign);
}

export async function deleteCampaignByIdHandler(
  request: FastifyRequest<{ Params: ByCampaignIdParams }>,
  reply: FastifyReply,
) {
  const campaign = await deleteCampaign(request.params.campaignId);
  return reply.status(200).send(campaign);
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
  } = request.body;
  const { campaignId } = request.params;

  try {
    if (type === CampaignType.DRIP) {
      await updateCampaign(campaignId, {
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
      await updateCampaign(campaignId, {
        status: CampaignStatus.DEQUEUING,
        campaignSentAt: null,
        scheduledStatuses: [],
      });
      await deleteCampaignParticipantsByCampaignId(campaignId);
      return reply.status(200).send({
        message: "Campaign schedule cancellation requested",
        code: "MSG_SCHEDULE_CANCEL_REQUESTED",
      });
    }
    const campaign = await getCampaignById(campaignId);
    if (
      [CampaignStatus.DEQUEUING, CampaignStatus.QUEUING].includes(
        campaign.status,
      )
    ) {
      return reply.status(400).send({
        message: `Campaign ${campaign.status} is in progress, so no action can be performed at this time.`,
        code: "CAMPAIGN_ENQUEUE_DEQUEUE_IN_PROGRESS",
      });
    }
    const count = await getCampaignParticipantCountByStatuses(
      campaignId,
      sendToStatuses,
    );
    if (count === 0) {
      return reply.status(400).send({
        message: `No participants with the specified statuses to send the campaign to.`,
        code: "NO_PARTICIPANTS_FOR_CAMPAIGN",
      });
    }

    if (campaignSentAt && sentCampaignChoice === SentCampaignEnum.LATER) {
      await updateCampaign(campaignId, {
        status: CampaignStatus.QUEUING,
        campaignSentAt,
        scheduledStatuses: [],
      });
      await enqueueCampaignMessage(
        campaignId,
        sendToStatuses,
        undefined,
        campaignSentAt,
      );
      return reply.status(200).send({
        message: "Campaign scheduling requested",
        code: "MSG_SCHEDULE_REQUESTED",
      });
    }
    await updateCampaign(campaignId, {
      status: CampaignStatus.QUEUING,
      campaignSentAt: null,
      scheduledStatuses: [],
    });

    await enqueueCampaignMessage(campaignId, sendToStatuses, participantId);
    return reply.status(200).send({
      message:
        "Campaign enqueue request accepted. Processing will occur asynchronously.",
      code: "ENQUEUE_REQUEST_ACCEPTED",
    });
  } catch (error) {
    log.error("Error while handling sendCampaignHandler", error);
    return reply.code(500).send({
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
}

export async function getCampaignFilterForFlowsHandler(
  request: FastifyRequest<{ Querystring: bySurveyIdSchema }>,
  reply: FastifyReply,
) {
  if (!request.query.surveyId) {
    return reply.status(400).send("surveyId is required");
  }
  const result = await getCampaignFilterForFlows(request.query.surveyId);
  return reply.status(200).send(result);
}

export async function getResponseByCampaignByIdHandler(
  request: FastifyRequest<{
    Params: ByCampaignIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const res = await getResponseByCampaignById(request.params.campaignId);
    return reply.status(200).send(res);
  } catch (error) {
    log.error("Error while handling getResponseByCampaignById", error);
    return reply.code(500).send(error);
  }
}

export async function getResponseExcelByCampaignByIdHandler(
  request: FastifyRequest<{
    Params: ByCampaignIdParams;
    Querystring: { selectedDripStage?: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { title, data } = await getResponseExcelByCampaignById(
      request.params.campaignId,
      request.query.selectedDripStage,
    );
    reply.header("filename", `${encodeURIComponent(title)}.xlsx`);
    reply.header("Access-Control-Expose-Headers", "filename");
    reply.status(200).type("application/xlsx").send(data);
  } catch (error) {
    log.error("Error while handling getResponseExcelByCampaignById", error);
    return reply.code(500).send(error);
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
      request.query.selectedDripStage,
    );
    reply.code(200).send(stats);
  } catch (e) {
    log.error("Error in getting campain stats", e);
    return reply.code(500).send(e);
  }
}
