import { FastifyRequest, FastifyReply } from "fastify";
import { createTemplate, deleteTemplate, deleteTemplateFromDb, getTemplate, getTemplates, saveTemplate, syncTemplates, updateTemplate } from "./wa_templates.service";
import { CreateWaTemplateInput, ByTemplateIdParamsSchema, WaTemplateFormatted } from "./wa_templates.schema";
import { generateTemplate } from "./wa_templates.utils";
import { ByTeamIdParams } from "../../team/team.schema";
import { log } from "../../../utils/logger";
import Session from "supertokens-node/recipe/session";
import { getTeamsByUserId } from "../../team/team.service";

export async function getTemplatesHandler(
  request: FastifyRequest<{
    Params: ByTeamIdParams
  }>,
  reply: FastifyReply
) {
  const templates = await getTemplates([request.params.teamId]);
  reply.code(200).send(templates);
}

export async function createTemplateHandler(
  request: FastifyRequest<{
    Body: CreateWaTemplateInput,
    Params: ByTeamIdParams
  }>,
  reply: FastifyReply
) {
  const formattedTemplate = generateTemplate(request.body)
  const template = await createTemplate(formattedTemplate);
  await saveTemplate(template, request.body.acceptButton, request.params.teamId)
  reply.code(200);
}

export async function updateTemplateHandler(
  request: FastifyRequest<{
    Params: ByTemplateIdParamsSchema,
    Body: CreateWaTemplateInput
  }>,
  reply: FastifyReply
) {
  const updatedTemplate = await updateTemplate(request.params.templateId, request.body);
  if (updatedTemplate) {
    reply.status(200).send(updatedTemplate)
  } else {
    reply.status(500)
  }
}

export async function deleteTemplateHandler(
  request: FastifyRequest<{
    Params: ByTemplateIdParamsSchema
  }>,
  reply: FastifyReply
) {
  const { templateId } = request.params;
  try {
    const { data: template } = await getTemplate(templateId);
    const { id, name } = template as WaTemplateFormatted;
    const deleted = await deleteTemplate(id, name);
    if (deleted) {
      await deleteTemplateFromDb(templateId);
      reply.code(200);
    } else {
      reply.code(500);
    }
  } catch (e) {
    reply.code(500)
  }
}

export async function syncTemplatesHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const session = await Session.getSession(request, reply);
  const userId = session.getUserId();

  const teams = await getTeamsByUserId(userId);
  const teamIds = teams.map(team => team.teamId);
  const synced = await syncTemplates(teamIds);
  if (synced) {
    reply.code(200);
  } else {
    reply.code(500);
  }
}