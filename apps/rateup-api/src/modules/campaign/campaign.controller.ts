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
  getCampaignById,
  getCampaignFilterForFlows,
  getCampaignsByOrgId,
  getCampaignsByTeamId,
  sendCampaign,
  updateCampaign,
} from "./campaign.service";
import { Role } from "@prisma/client";
import { verifyRole } from "../../utils/auth";
import { getDbTemplate } from "../whatsapp/messageTemplates/wa_templates.service";
import { bySurveyIdSchema } from "../surveyTheme/surveyTheme.schema";
import { CampaignStatus, SentCampaignEnum } from "../../types/enums";

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
    if (verifyRole(request, reply, Role.SUPER_ADMIN)) {
      res = await getCampaignsByOrgId(request.user.orgId);
    }
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
  if (
    !request.body.sendToStatuses ||
    request.body.sendToStatuses.length === 0
  ) {
    return reply.status(400).send({ message: "sendToStatuses is required" });
  }
  if (request.body.status === CampaignStatus.INACTIVE) {
    await updateCampaign(request.params.campaignId, {
      status: CampaignStatus.ACTIVE,
      campaignSentAt: null,
      scheduledStatuses: [],
    });
    return reply.status(200).send({
      message: "Campaign schedule cancelled",
      code: "MSG_SCHEDULED",
    });
  }
  if (
    request.body.campaignSentAt &&
    request.body.sentCampaignChoice === SentCampaignEnum.LATER
  ) {
    await updateCampaign(request.params.campaignId, {
      status: CampaignStatus.SCHEDULED,
      campaignSentAt: request.body.campaignSentAt,
      scheduledStatuses: request.body.sendToStatuses,
    });
    return reply.status(200).send({
      message: "Campaign scheduled successfully",
      code: "MSG_SCHEDULED",
    });
  }
  await sendCampaign(
    request.params.campaignId,
    request.body.sendToStatuses,
    request.body.participantId,
  );
  return reply.status(204).send();
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
