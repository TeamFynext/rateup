import { FastifyReply, FastifyRequest } from "fastify";
import {
  ByTemplateIdParamsSchema,
  CreateWaTemplateInput,
  RegisterTemplatesInDbBodySchema,
  WaTemplateFormatted,
  WaUserSendTemplateBodySchema,
} from "./wa_templates.schema";
import {
  createTemplate,
  deleteTemplate,
  deleteTemplateFromDb,
  fetchTemplate,
  getDbTemplate,
  getTemplateByIdAndOrgId,
  getTemplateComponents,
  getTemplatesByOrgId,
  getUnregisteredTemplates,
  handleFlowComponents,
  registerTemplatesInDb,
  saveTemplate,
  sendTemplateToPhone,
  syncTemplates,
  updateTemplate,
  updateTemplateInDb,
  uploadFileToWaTemplate,
} from "./wa_templates.service";
import { generateTemplate, waAllowedMimeTypes } from "./wa_templates.utils";
import {
  WaTemplateComponentType,
  WaTemplateStatus,
  WaTemplateSupportedFormats,
} from "../../../../../../../types/enums";
import { log } from "../../../../../../../utils/logger";
import prisma from "../../../../../../../utils/prisma";
import {
  SendTemplateToContacts,
  SendTemplateToContactGroups,
  SendTemplateToContact,
  SendTemplateByNameToPhone,
  ErrorLogsQuery,
} from "../../../template/wa_templates.external.schema";
import { ByContactIdParams } from "../../../../contact/internal-copy/contact/contact.schema";
import { parsePhoneNumber } from "libphonenumber-js";
import { sendTemplateToUserCore } from "../../../../../../whatsapp/messageTemplates/wa_templates.controller";
import { callWhatsappApi } from "../wa_axios";

export async function getTemplatesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const orgId = request.user.orgId;
  const templates = await getTemplatesByOrgId(orgId);
  reply.code(200).send(templates);
}

export async function getTemplateByIdHandler(
  request: FastifyRequest<{
    Params: ByTemplateIdParamsSchema;
  }>,
  reply: FastifyReply,
) {
  const orgId = request.user.orgId;
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
    const orgId = request.user.orgId;
    // TODO: restrict access to super admin and admin?

    const { defaultValues, ...templateData } = request.body;
    const formattedTemplate = generateTemplate(templateData);
    const template = await createTemplate(orgId, formattedTemplate);
    //this is required to fetch the template from whatsapp to retreive the actual template data from whatsap
    const fetchedTemplate = await fetchTemplate(template?.name, orgId);
    if (templateData?.id) {
      await updateTemplateInDb(templateData.id, fetchedTemplate);
    } else {
      await saveTemplate(
        fetchedTemplate,
        orgId,
        defaultValues as WaTemplateDefaultValues,
      );
    }
    reply.code(200).send("template created");
  } catch (e) {
    log.error("Error creating template \n%o", e?.response?.data);
    let errorMessage = e?.message?.split("error_message:")?.[1];
    reply.code(500).send(errorMessage ?? e);
  }
}

export async function saveTemplateAsDraftHandler(
  request: FastifyRequest<{
    Body: CreateWaTemplateInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const orgId = request.user.orgId;
    const { defaultValues, ...templateData } = request.body;
    let formattedTemplate: any = generateTemplate(templateData);
    formattedTemplate.status = WaTemplateStatus.DRAFT;
    if (request.body?.id) {
      const template = await getDbTemplate(request.body.id);
      template.data.name = request.body.name ?? template.data.name;
      template.data.components = formattedTemplate.components ?? [];
      template.data.status = WaTemplateStatus.DRAFT;
      template.data.language = formattedTemplate.language ?? "en";
      await updateTemplateInDb(request.body.id, template.data);
    } else {
      await saveTemplate(
        formattedTemplate,
        orgId,
        defaultValues as WaTemplateDefaultValues,
      );
    }
    reply.code(200);
  } catch (e) {
    log.error("Error saving template as Draft\n%o", e?.response?.data);
    let errorMessage = e?.message?.split("error_message:")?.[1];
    reply.code(500).send(errorMessage ?? e);
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
    const orgId = request.user.orgId;
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
    let errorMessage = e?.message?.split("error_message:")?.[1];
    reply.code(500).send(errorMessage ?? e);
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
    const { id, name } = template as WaTemplateFormatted;
    if (id) {
      await deleteTemplate(orgId, id, name);
    }
    await deleteTemplateFromDb(templateId);
    reply.code(204);
  } catch (e) {
    reply.code(500);
  }
}

export async function syncTemplatesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const synced = await syncTemplates(request.user.orgId);
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
    const orgId = request.user.orgId;
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
    const orgId = request.user.orgId;
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
    const orgId = request.user.orgId;
    const size: any = data.fields.size;
    const { uploadSessionId, fileHandle } = await uploadFileToWaTemplate(
      data,
      size?.value,
      orgId,
    );
    if (fileHandle === "error")
      return reply.code(400).send("image upload failed");
    return reply.code(200).send({ id: fileHandle, uploadSessionId });
  } catch (e) {
    const error =
      typeof e?.message === "string" ? e?.message : e?.response?.data;
    log.error("Error uploading image to whatsapp templates \n%o", error);

    reply.code(500).send(error);
  }
}

export async function sendTemplateToUserHandler(
  request: FastifyRequest<{
    Params: ByTemplateIdParamsSchema;
    Body: WaUserSendTemplateBodySchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { templateId } = request.params;
    const { phone, parameterData, teamId } = request.body;
    const { orgId, userId } = request.user;

    await sendTemplateToUserCore(
      orgId,
      templateId,
      phone,
      parameterData,
      teamId,
      userId,
    );

    reply.code(200).send("Template send to user successfully");
  } catch (error) {
    log.error("Error sending template to user \n%o", error);
    reply.code(500).send(error);
  }
}

export async function sendTemplateToContactHandler(
  req: FastifyRequest<{
    Body: SendTemplateToContact;
    Params: ByTemplateIdParamsSchema & ByContactIdParams;
  }>,
  res: FastifyReply,
) {
  try {
    const { templateId } = req.params;
    const { teamId, header, body_variables, timeDelay } = req.body;

    const orgId = req.user.orgId;
    const dbTemplate = await getTemplateByIdAndOrgId(templateId, orgId);

    const contact = await prisma.contact.findUnique({
      where: {
        id: req.params.contactId,
      },
      select: {
        phone: true,
      },
    });

    let { containsFlowButton, surveyTeamMap, components, dbFlow } =
      await getTemplateComponents({
        orgId,
        dbTemplate,
        body_variables,
        teamId,
        header,
      });

    if (containsFlowButton)
      components = await handleFlowComponents(
        contact.phone,
        orgId,
        surveyTeamMap,
        dbFlow,
        components,
        timeDelay,
      );
    const response = await sendTemplateToPhone({
      orgId,
      phone: contact.phone,
      dbTemplate,
      timeDelay,
      components,
      surveyTeamMap,
    });
    res
      .code(200)
      .send(
        timeDelay
          ? { status: response.status, scheduleId: response?.id }
          : response,
      );
  } catch (error) {
    log.error("Error sending template to contacts \n%o", error);
    res.code(500).send(error);
  }
}

export async function sendTemplateByNameToPhoneHandler(
  req: FastifyRequest<{
    Body: SendTemplateByNameToPhone;
  }>,
  rep: FastifyReply,
) {
  try {
    const {
      templateName,
      timeDelay,
      teamId,
      body_variables,
      parameterData,
      tag,
    } = req.body;
    log.info("🚀 ~ req.body - external: %o", req.body);
    const orgId = req.user.orgId;
    const userId = req.user.userId;
    let reqNumber = "+" + req.body.phone;
    let phone = parsePhoneNumber(reqNumber);
    if (phone.isValid() === false) {
      return rep.code(400).send("Invalid phone number.");
    }
    let phoneNumber = phone.number.replace("+", "");
    let header: any = [];
    for (let { filename, link, type } of parameterData || []) {
      header.push({
        type: WaTemplateComponentType.HEADER,
        parameters: [
          {
            type,
            [type]: {
              link,
              filename,
            },
          },
        ],
      });
    }
    if (body_variables?.length > 0) {
      header.push({
        type: WaTemplateComponentType.BODY,
        parameters: body_variables.map((variable) => {
          return {
            type: "text",
            text: variable,
          };
        }),
      });
    }
    const response = await sendTemplateToUserCore(
      orgId,
      templateName,
      phoneNumber,
      header,
      teamId,
      userId,
      timeDelay,
      true,
      tag,
    );
    rep
      .code(200)
      .send(
        timeDelay
          ? { status: response.status, scheduleId: response?.id }
          : response,
      );
  } catch (error) {
    log.error("Error sending template to contacts \n%o", error);
    if (error instanceof Error) {
      rep.code(400).send(error?.message);
    } else {
      rep
        .code(500)
        .send(error?.message ?? "Error sending template to contacts");
    }
  }
}
import FormData from "form-data";
import { getWaSettings } from "../settings/wa_settings.service";

export async function sendTemplateByNameToPhoneWithFileHandler(
  req: FastifyRequest,
  rep: FastifyReply,
) {
  try {
    const data = await req.file();

    if (!data.file) {
      return rep.code(400).send("File is required");
    }

    const templateName = data.fields.templateName?.["value"];
    if (!templateName) {
      return rep.code(400).send("Template name is required");
    }

    const phoneValue = data.fields.phone?.["value"];
    if (!phoneValue) {
      return rep.code(400).send("Phone number is required");
    }

    const formattedPhoneNumber = "+" + phoneValue;
    const phone = parsePhoneNumber(formattedPhoneNumber);
    if (!phone.isValid()) {
      return rep.code(400).send("Invalid phone number format");
    }

    const orgId = req.user.orgId;
    if (!orgId) {
      return rep.code(400).send("Organization ID is required");
    }

    const timeDelay = data.fields.timeDelay?.["value"];
    const teamId = data.fields.teamId?.["value"];
    const body_variables = data.fields.body_variables?.["value"];
    const tag = data.fields.tag?.["value"];
    const type = data.fields.headerType?.["value"];
    const filename = data.fields.filename?.["value"];

    log.info("🚀 ~ req.body - external: %o", {
      templateName,
      timeDelay,
      teamId,
      body_variables,
      tag,
      phone,
      type,
      filename,
    });
    const userId = req.user.userId;

    let phoneNumber = phone.number.replace("+", "");
    let header: any = [];
    const headerType = type ? type?.toLowerCase() : "";
    if (["document", "image", "video"].includes(type)) {
      const waSettings = await getWaSettings(orgId);

      const form = new FormData();
      form.append("messaging_product", "whatsapp");
      form.append("file", data.file, {
        filename: data.filename,
        contentType: data.mimetype,
      });
      const uploadedFile = await callWhatsappApi(
        `/${waSettings?.phoneId}/media`,
        "POST",
        waSettings?.accessToken,
        form,
        {},
        form.getHeaders(),
      );
      if (!uploadedFile) {
        log.error("file not uploaded to /media");
        return;
      }
      header.push({
        type: WaTemplateComponentType.HEADER,
        parameters: [
          {
            type: headerType,
            [headerType]: {
              id: uploadedFile?.data?.id,
              ...(headerType === "document"
                ? { filename: filename ? filename : data?.filename }
                : {}),
            },
          },
        ],
      });
    }
    if (body_variables?.length > 0) {
      header.push({
        type: WaTemplateComponentType.BODY,
        parameters: body_variables.map((variable) => {
          return {
            type: "text",
            text: variable,
          };
        }),
      });
    }
    const response = await sendTemplateToUserCore(
      orgId,
      templateName,
      phoneNumber,
      header,
      teamId,
      userId,
      timeDelay,
      true,
      tag,
    );
    rep
      .code(200)
      .send(
        timeDelay
          ? { status: response.status, scheduleId: response?.id }
          : response,
      );
  } catch (error) {
    log.error("Error sending template to contacts \n%o", error);
    if (error instanceof Error) {
      rep.code(400).send(error?.message);
    } else {
      rep
        .code(500)
        .send(error?.message ?? "Error sending template to contacts");
    }
  }
}

export async function sendTemplatesToContactsHandler(
  req: FastifyRequest<{
    Body: SendTemplateToContacts;
    Params: ByTemplateIdParamsSchema;
  }>,
  res: FastifyReply,
) {
  try {
    const { templateId } = req.params;
    const orgId = req.user.orgId;
    const { teamId, header, timeDelay } = req.body;
    const dbTemplate = await getTemplateByIdAndOrgId(templateId, orgId);
    const contacts = await prisma.contact.findMany({
      where: {
        id: {
          in: req.body.contactIds,
        },
      },
      select: {
        phone: true,
      },
    });

    const { containsFlowButton, surveyTeamMap, components, dbFlow } =
      await getTemplateComponents({
        orgId,
        dbTemplate,
        header,
        teamId,
      });

    for (const contact of contacts) {
      let templateComponents = [...components];
      if (containsFlowButton)
        templateComponents = await handleFlowComponents(
          contact.phone,
          orgId,
          surveyTeamMap,
          dbFlow,
          templateComponents,
          timeDelay,
        );
      await sendTemplateToPhone({
        orgId,
        phone: contact.phone,
        dbTemplate,
        timeDelay,
        components: templateComponents,
        surveyTeamMap,
      });
    }
  } catch (error) {
    log.error("Error sending template to contacts \n%o", error);
    res.code(500).send(error);
  }
}

export async function sendTemplatesToContactGroupsHandler(
  req: FastifyRequest<{
    Body: SendTemplateToContactGroups;
    Params: ByTemplateIdParamsSchema;
  }>,
  res: FastifyReply,
) {
  try {
    const { templateId } = req.params;
    const orgId = req.user.orgId;
    const dbTemplate = await getTemplateByIdAndOrgId(templateId, orgId);
    // TODO: can we optimize this query?
    const contacts = await prisma.contact.findMany({
      where: {
        contactGroups: {
          some: {
            contactGroupId: {
              in: req.body.contactGroupIds,
            },
          },
        },
      },
      select: {
        phone: true,
      },
    });

    let { containsFlowButton, surveyTeamMap, components, dbFlow } =
      await getTemplateComponents({
        orgId,
        dbTemplate,
        header: req.body.header,
        teamId: req.body.teamId,
      });
    for (const contact of contacts) {
      let templateComponents = [...components];
      if (containsFlowButton)
        templateComponents = await handleFlowComponents(
          contact.phone,
          orgId,
          surveyTeamMap,
          dbFlow,
          templateComponents,
          req.body.timeDelay,
        );
      await sendTemplateToPhone({
        orgId,
        phone: contact.phone,
        dbTemplate,
        timeDelay: req.body.timeDelay,
        components: templateComponents,
        surveyTeamMap,
      });
    }
  } catch (error) {
    log.error("Error sending template to contactGroups \n%o", error);
    res.code(500).send(error);
  }
}

const getLatestStatus = (statusObj) => {
  if (statusObj?.read) return "read";
  if (statusObj?.delivered) return "delivered";
  if (statusObj?.failed) return "failed";
  if (statusObj?.sent) return "sent";
  return "pending";
};
export async function getMessageStatusByIdHandler(
  request: FastifyRequest<{
    Params: { messageId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { messageId } = request.params;
    const messageStatus = await prisma.waMessage.findFirst({
      where: { messageId },
      select: {
        messageId: true,
        stats: true,
        errorMessage: true,
      },
    });
    if (!messageStatus)
      return reply.code(404).send({ message: "Message not found" });
    let status = getLatestStatus(messageStatus.stats);
    let response = {
      messageId: messageStatus.messageId,
      status,
      ...(status === "failed"
        ? { errorMessage: messageStatus.errorMessage }
        : {}),
    };

    reply.code(200).send(response);
  } catch (error) {
    log.error("Error getting message status by id \n%o", error);
    reply.code(500).send(error);
  }
}

export async function getErrorLogsHandler(
  request: FastifyRequest<{
    Querystring: ErrorLogsQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const data = await prisma.waLogs.findMany({
      where: {
        orgId: request.user.orgId,
        createdAt: {
          ...(request.query.endDate
            ? { lte: new Date(request.query.endDate) }
            : {}),
          ...(request.query.startDate
            ? { gte: new Date(request.query.startDate) }
            : {}),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      omit: {
        orgId: true,
      },
    });
    return reply.code(200).send(data);
  } catch (error) {
    log.error("Error getting error logs \n%o", error);
    reply.code(500).send({ message: "Error getting error logs" });
  }
}
