import { Role } from "@prisma/client";
import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger";
import { getOrgIdAndRole } from "../../user/user.service";
import {
  ByTemplateIdParamsSchema,
  CreateWaTemplateInput,
  RegisterTemplatesInDbBodySchema,
  WaTemplateFormatted,
} from "./wa_templates.schema";
import {
  createTemplate,
  deleteTemplate,
  deleteTemplateFromDb,
  getDbTemplate,
  getTemplateByIdAndOrgId,
  getTemplatesByOrgId,
  getUnregisteredTemplates,
  registerTemplatesInDb,
  saveTemplate,
  syncTemplates,
  updateTemplate,
  uploadFileToWaTemplate,
} from "./wa_templates.service";
import { generateTemplate, waAllowedMimeTypes } from "./wa_templates.utils";

export async function getTemplatesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { orgId } = await getOrgIdAndRole({ id: request.userId });
  const templates = await getTemplatesByOrgId(orgId);
  reply.code(200).send(templates);
}

export async function getTemplateByIdHandler(
  request: FastifyRequest<{
    Params: ByTemplateIdParamsSchema;
  }>,
  reply: FastifyReply,
) {
  const { orgId } = await getOrgIdAndRole({ id: request.userId });
  const templates = await getTemplateByIdAndOrgId(
    request.params.templateId,
    orgId,
  );
  reply.code(200).send(templates);
}

export async function createTemplateHandler(
  request: FastifyRequest<{
    Body: CreateWaTemplateInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = await getOrgIdAndRole({ id: request.userId });
    // TODO: restrict access to super admin and admin?

    const formattedTemplate = generateTemplate(request.body);
    const template = await createTemplate(orgId, formattedTemplate);
    await saveTemplate(template, request.body.acceptButton, orgId);
    reply.code(200);
  } catch (e) {
    log.error("Error creating template \n%o", e?.response?.data);
    reply.code(500).send(e?.response?.data?.error?.error_user_msg ?? e);
  }
}

export async function updateTemplateHandler(
  request: FastifyRequest<{
    Params: ByTemplateIdParamsSchema;
    Body: CreateWaTemplateInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = await getOrgIdAndRole({ id: request.userId });
    const template = await getDbTemplate(request.params.templateId);

    if (!template) {
      reply.status(404);
      log.trace("Template not found");
      return;
    } else if (template.orgId !== orgId) {
      log.trace(
        "User %s tried to update template %s from another org",
        request.userId,
        request.params.templateId,
      );
      reply.status(403);
      return;
    }

    const updatedTemplate = await updateTemplate(
      request.params.templateId,
      request.body,
    );
    if (updatedTemplate) {
      reply.status(200).send(updatedTemplate);
    } else {
      reply
        .status(400)
        .send("You can only edit an active template once in 24 hours.");
    }
  } catch (e) {
    log.error("Error updating template \n%o", e?.response?.data);
    reply.code(500).send(e?.response?.data?.error?.error_user_msg ?? e);
  }
}

export async function deleteTemplateHandler(
  request: FastifyRequest<{
    Params: ByTemplateIdParamsSchema;
  }>,
  reply: FastifyReply,
) {
  const { templateId } = request.params;
  try {
    const { data: template, orgId } = await getDbTemplate(templateId);
    const { orgId: userOrg } = await getOrgIdAndRole({ id: request.userId });
    if (userOrg !== orgId) {
      reply.code(403);
      return;
    }
    const { id, name } = template as WaTemplateFormatted;
    const deleted = await deleteTemplate(orgId, id, name);
    if (deleted) {
      await deleteTemplateFromDb(templateId);
      reply.code(200);
    } else {
      reply.code(500);
    }
  } catch (e) {
    reply.code(500);
  }
}

export async function syncTemplatesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { orgId, role } = await getOrgIdAndRole({ id: request.userId });

  if (role !== Role.SUPER_ADMIN && role !== Role.ADMIN) {
    reply.code(403);
    return;
  }
  const synced = await syncTemplates(orgId);
  if (synced) {
    reply.code(200);
  } else {
    reply.code(500);
  }
}

export async function getUnregisteredTemplatesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = await getOrgIdAndRole({ id: request.userId });
    const unregisteredTemplates = await getUnregisteredTemplates(orgId);
    reply.code(200).send(unregisteredTemplates);
  } catch (e) {
    log.error("Error getting unregistered templates \n%o", e);
    reply.code(500);
  }
}

export async function registerTemplatesInDbHandler(
  request: FastifyRequest<{
    Body: RegisterTemplatesInDbBodySchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = await getOrgIdAndRole({ id: request.userId });
    await registerTemplatesInDb(request.body, orgId);
    reply.code(200);
  } catch (e) {
    log.error("Error registering templates \n%o", e);
    reply.code(500);
  }
}

export async function uploadHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const data = await request.file();
    if (!waAllowedMimeTypes.includes(data?.mimetype) || data.type !== "file")
      return reply
        .code(400)
        .send({ message: "This file type is not permitted." });
    const { orgId } = await getOrgIdAndRole({ id: request.userId });
    const size: any = data.fields.size;
    const id = await uploadFileToWaTemplate(data, size?.value, orgId);
    if (id === "error") return reply.code(400).send("image upload failed");
    reply.code(200).send({ id });
  } catch (e) {
    log.error(
      "Error uploading image to whatsapp templates \n%o",
      e?.response?.data,
    );
    reply.code(500).send(e?.response?.data);
  }
}
