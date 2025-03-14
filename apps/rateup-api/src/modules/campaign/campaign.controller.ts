import { FastifyRequest, FastifyReply } from "fastify";
import {
  ByCampaignIdParams,
  ByFlowIdParams,
  CreateCampaignInput,
  GetCampaignsQuery,
  SendCampaignInput,
  UpdateCampaignInput,
} from "./campaign.schema";
import {
  createCampaign,
  deleteCampaign,
  deleteCampaignParticipantsByCampaignId,
  doesCampaignIdExistInMessageQueue,
  enqueueCampaignMessage,
  getCampaginStatsById,
  getCampaignById,
  getCampaignFilterForFlows,
  getCampaignsByOrgId,
  getCampaignsByTeamId,
  getResponseByCampaignById,
  getResponseExcelByCampaignById,
  sendCampaign,
  updateCampaign,
  updateCampaignMessageQueueRetryCount,
} from "./campaign.service";
import { Role } from "@prisma/client";
import { verifyRole } from "../../utils/auth";
import { getDbTemplate } from "../whatsapp/messageTemplates/wa_templates.service";
import { bySurveyIdSchema } from "../surveyTheme/surveyTheme.schema";
import {
  CampaignParticipantStatus,
  CampaignStatus,
  SentCampaignEnum,
} from "../../types/enums";
import { log } from "../../utils/logger";

export async function createCampaignHandler(
  request: FastifyRequest<{ Body: CreateCampaignInput }>,
  reply: FastifyReply,
) {
  const { waTemplateId } = request.body;
  const dbTemplate = await getDbTemplate(waTemplateId);
  if (!dbTemplate) {
    return reply.status(400).send({ message: "Template not found" });
  }

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
    res = await getCampaignsByOrgId(request.user.orgId);
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
  } = request.body;
  const { campaignId } = request.params;

  try {
    if (status === CampaignStatus.INACTIVE) {
      await updateCampaign(campaignId, {
        status: CampaignStatus.ACTIVE,
        campaignSentAt: null,
        scheduledStatuses: [],
      });
      await deleteCampaignParticipantsByCampaignId(campaignId);
      return reply.status(200).send({
        message: "Campaign schedule cancelled",
        code: "MSG_SCHEDULED",
      });
    }

    if (campaignSentAt && sentCampaignChoice === SentCampaignEnum.LATER) {
      await updateCampaign(campaignId, {
        status: CampaignStatus.SCHEDULED,
        campaignSentAt,
        scheduledStatuses: [],
      });
      const isScheduled = await enqueueCampaignMessage(
        campaignId,
        sendToStatuses,
        undefined,
        campaignSentAt,
      );
      if (!isScheduled.status) {
        return reply.status(400).send({
          message: isScheduled.message,
          code: "MSG_NOT_SCHEDULED",
        });
      }
      return reply.status(200).send({
        message: "Campaign scheduled successfully",
        code: "MSG_SCHEDULED",
      });
    }
    await updateCampaign(campaignId, {
      status: CampaignStatus.ACTIVE,
      campaignSentAt: null,
      scheduledStatuses: [],
    });

    const isScheduled = await enqueueCampaignMessage(
      campaignId,
      sendToStatuses,
      participantId,
    );
    if (!isScheduled.status) {
      return reply.status(400).send({
        message: isScheduled.message,
        code: "MSG_NOT_SCHEDULED",
      });
    }
    return reply.status(204).send();
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
  }>,
  reply: FastifyReply,
) {
  try {
    const [title, data] = await getResponseExcelByCampaignById(
      request.params.campaignId,
    );
    reply.header("filename", `${title}.xlsx`);
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
  }>,
  reply: FastifyReply,
) {
  try {
    const stats = await getCampaginStatsById(request.params.campaignId);
    reply.code(200).send(stats);
  } catch (e) {
    log.error("Error in getting campain stats", e);
    return reply.code(500).send(e);
  }
}
