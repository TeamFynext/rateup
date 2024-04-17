import { FastifyRequest, FastifyReply } from "fastify";
import {
  ByCampaignIdParams,
  CreateCampaignInput,
  GetCampaignsQuery,
  UpdateCampaignInput,
} from "./campaign.schema";
import {
  createCampaign,
  deleteCampaign,
  getCampaignById,
  getCampaignsByOrgId,
  getCampaignsByTeamId,
  startCampaign,
  updateCampaign,
} from "./campaign.service";
import { Role } from "@prisma/client";
import { verifyRole } from "../../utils/auth";
import { CampaignStatus } from "../../types/enums";
import { getDbTemplate } from "../whatsapp/messageTemplates/wa_templates.service";
import { getFlowWithSurveyTeamMapIds } from "../whatsapp/flows/flow.service";
import { log } from "../../utils/logger";

export async function createCampaignHandler(
  request: FastifyRequest<{ Body: CreateCampaignInput }>,
  reply: FastifyReply,
) {
  const { teamId, waTemplateId } = request.body;
  const dbTemplate = await getDbTemplate(waTemplateId);
  if (!dbTemplate) {
    return reply.status(400).send({ message: "Template not found" });
  }

  const flowId = dbTemplate.data.components
    .find((c) => c.type === "BUTTONS")
    ?.buttons.find((b) => b.type === "FLOW")
    ?.["flow_id"].toString();

  const dbFlow = await getFlowWithSurveyTeamMapIds(flowId);
  if (!dbFlow) {
    log.error("Flow not found in db with id %s", flowId);
    reply.code(500).send("Flow not found in db");
    return;
  }

  const surveyTeamMap = dbFlow?.survey?.teams.find((t) => t.teamId === teamId)
    ?.id;
  if (!surveyTeamMap) {
    log.error("Team not found in survey;\nteam => %s", teamId);
    reply.code(500).send("Team not found in survey");
    return;
  }
  const campaign = await createCampaign({
    ...request.body,
    surveyTeamMapId: surveyTeamMap,
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

export async function startCampaignHandler(
  request: FastifyRequest<{ Params: ByCampaignIdParams }>,
  reply: FastifyReply,
) {
  await startCampaign(request.params.campaignId);
  return reply.status(204).send();
}
