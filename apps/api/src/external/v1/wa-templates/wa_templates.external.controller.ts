import { FastifyReply, FastifyRequest } from "fastify";
import type { OutgoingTemplateComponent } from "../../../types/whatsapp.types.js";
import { sendTemplateToUserCore } from "../../../modules/whatsapp/messageTemplates/wa_templates.controller.js";
import { TemplateTypeParamsSchema } from "../../../modules/whatsapp/messageTemplates/wa_templates.schema.js";
import {
  getTemplateByIdAndOrgId,
  getTemplatesByOrgIdAndTemplateType,
} from "../../../modules/whatsapp/messageTemplates/wa_templates.service.js";
import {
  SendTemplateByNameToPhone,
  SendTemplateToContacts,
  SendTemplateWithFile,
} from "./wa_templates.external.schema.js";
import type { ByTemplateIdParamsSchema } from "./wa_templates.schema.js";
import { sendTemplateToPhone } from "./sendTemplateToPhone.js";
import prisma from "../../../utils/prisma.js";
import {
  contactFields,
  primaryIdentities,
} from "../../../modules/contact/identity/contactFields.js";
import { log } from "../../../utils/logger.js";
import { ParseError, parsePhoneNumberWithError } from "libphonenumber-js";
import { TemplateSendError } from "../../../modules/whatsapp/messageTemplates/templateSendError.js";
import {
  ActiveContactLimitError,
  OrgSuspendedError,
} from "../../../modules/whatsapp/whatsappSurvey/wasurvey.auth.js";
import { getWaSettings } from "../../../modules/whatsapp/settings/wa_settings.service.js";
import { WaTemplateComponentType } from "../../../types/enums.js";
import { templateFileUploadSchema } from "./wa_templates.utils.js";
import FormData from "form-data";
import { callMetaApi } from "../../../modules/whatsapp/wa_axios.js";

/**
 * A `teamId` decides which team a send (and its inbox thread) is filed under, and the
 * senders take it as given — so another org's team id has to be refused before them.
 */
async function isForeignTeam(orgId: string, teamId: string | undefined) {
  if (!teamId) return false;
  const team = await prisma.team.findFirst({ where: { id: teamId, orgId }, select: { id: true } });
  return !team;
}

/**
 * The text v1 answers a refused send with (400, a bare string, as it always has) — only for
 * failures whose message we wrote. Anything else (a database or network error) returns null
 * and is rethrown to the partner error handler, which logs it and answers a fixed 500, so
 * internal error text never reaches a partner.
 */
function sendRefusal(error: unknown): string | null {
  if (
    error instanceof TemplateSendError ||
    error instanceof ActiveContactLimitError ||
    error instanceof OrgSuspendedError ||
    error instanceof ParseError
  ) {
    return error.message;
  }
  return null;
}

/** The Fastify-style body `/send-with-file` already answers its own 404 with. */
const teamNotFound = {
  statusCode: 404,
  code: "FST_ERR_NOT_FOUND",
  error: "Not Found",
  message: "Team not found",
};

export async function getTemplatesExternalController(
  request: FastifyRequest<{
    Querystring: TemplateTypeParamsSchema;
  }>,
  reply: FastifyReply,
) {
  const { orgId } = request.user;
  const templates = await getTemplatesByOrgIdAndTemplateType(orgId, request.query.templateType);
  return reply.code(200).send(templates);
}

export async function sendTemplateByNameToPhoneExternalController(
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
      buttonVariable,
      quickReplyPayload,
    } = req.body;
    const orgId = req.user.orgId;
    const userId = req.user.userId;
    if (await isForeignTeam(orgId, teamId)) return rep.code(404).send(teamNotFound);
    let reqNumber = "+" + req.body.phone;
    let phone = parsePhoneNumberWithError(reqNumber);
    if (phone.isValid() === false) {
      return rep.code(400).send("Invalid phone number.");
    }
    let phoneNumber = phone.number.replace("+", "");
    const header: OutgoingTemplateComponent[] = [];
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
    if (body_variables && body_variables.length > 0) {
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
      buttonVariable,
      quickReplyPayload,
      true,
    );
    return rep
      .code(200)
      .send(timeDelay ? { status: response.status, scheduleId: response?.id } : response);
  } catch (error) {
    const refusal = sendRefusal(error);
    if (refusal === null) throw error;
    return rep.code(400).send(refusal);
  }
}

export async function sendTemplateByNameToPhoneWithFileExternalController(
  req: FastifyRequest<{
    Body: SendTemplateWithFile;
  }>,
  rep: FastifyReply,
) {
  try {
    const {
      templateName,
      phone: phoneValue,
      timeDelay,
      teamId,
      body_variables,
      tag,
      headerType,
      filename,
      file,
      buttonVariable,
      quickReplyPayload,
    } = req.body;
    const bodyVariables = body_variables || [];

    const orgId = req.user.orgId;
    if (!orgId)
      return rep.code(400).send({
        statusCode: 400,
        code: "FST_ERR_VALIDATION",
        error: "Bad Request",
        message: "Organization ID is required",
      });
    const formattedPhoneNumber = "+" + phoneValue;
    const phone = parsePhoneNumberWithError(formattedPhoneNumber);
    if (!phone.isValid())
      return rep.code(400).send({
        statusCode: 400,
        code: "FST_ERR_VALIDATION",
        error: "Bad Request",
        message: "Invalid phone number format",
      });

    if (await isForeignTeam(orgId, teamId)) return rep.code(404).send(teamNotFound);

    const userId = req.user.userId;
    let phoneNumber = phone.number.replace("+", "");
    const header: OutgoingTemplateComponent[] = [];
    const type = headerType ? headerType?.toLowerCase() : "";
    if (type || file) {
      const result = templateFileUploadSchema.safeParse({
        type,
        mimeType: file?.mimetype,
        sizeInBytes: file?.size ?? 1 * 1024 * 1024,
      });

      if (!result.success) {
        let errorMessage = JSON.parse(result.error.message ?? "{}");
        return rep.code(400).send({
          statusCode: 400,
          code: errorMessage?.[0]?.code || "FST_ERR_VALIDATION",
          error: "Bad Request",
          message: errorMessage?.[0]?.message,
        });
      }
      const waSettings = await getWaSettings(orgId);

      const form = new FormData();
      form.append("messaging_product", "whatsapp");
      form.append("file", file.data, {
        filename: file.filename,
        contentType: file.mimetype,
      });
      const uploadedFile = await callMetaApi(
        `/${waSettings?.phoneId}/media`,
        "POST",
        waSettings?.accessToken,
        form,
        {},
        form.getHeaders(),
      );
      if (!uploadedFile) {
        log.error("file not uploaded to /media");
        return rep.code(404).send({
          statusCode: 404,
          code: "FST_ERR_NOT_FOUND",
          error: "Not Found",
          message: "file not uploaded to /media",
        });
      }
      header.push({
        type: WaTemplateComponentType.HEADER,
        parameters: [
          {
            type,
            [type]: {
              id: uploadedFile?.data?.id,
              ...(type === "document" ? { filename: filename ? filename : file?.filename } : {}),
            },
          },
        ],
      });
    }
    if (bodyVariables?.length > 0) {
      header.push({
        type: WaTemplateComponentType.BODY,
        parameters: bodyVariables.map((variable) => {
          return {
            type: "text",
            text: variable?.toString(),
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
      buttonVariable,
      quickReplyPayload,
      true,
    );
    return rep
      .code(200)
      .send(timeDelay ? { status: response.status, scheduleId: response?.id } : response);
  } catch (error) {
    const refusal = sendRefusal(error);
    if (refusal === null) throw error;
    return rep.code(400).send(refusal);
  }
}

export async function sendTemplatesToContactsExternalController(
  req: FastifyRequest<{
    Body: SendTemplateToContacts;
    Params: ByTemplateIdParamsSchema;
  }>,
  res: FastifyReply,
) {
  const { templateId } = req.params;
  const orgId = req.user.orgId;
  const userId = req.userId;
  const dbTemplate = await getTemplateByIdAndOrgId(templateId, orgId);
  if (!dbTemplate) {
    return res.code(404).send({ message: "Template not found" });
  }
  if (await isForeignTeam(orgId, req.body.teamId)) {
    return res.code(404).send({ message: "Team not found" });
  }
  // Only the org's own contacts; the rest are counted as skipped.
  const contacts = await prisma.contact.findMany({
    where: {
      id: {
        in: req.body.contactIds,
      },
      orgId,
    },
    select: {
      id: true,
      ...primaryIdentities,
    },
  });

  let sent = 0;
  const failed: string[] = [];
  for (const contact of contacts) {
    // The phone, or the business-scoped user ID (BSUID) of a customer whose phone is withheld.
    const { phone, bsuid } = contactFields(contact.identities);
    const address = phone ?? bsuid;
    if (!address) continue;
    try {
      await sendTemplateToPhone({
        orgId,
        phone: address,
        dbTemplate,
        teamId: req.body.teamId,
        header: req.body.header,
        userId,
      });
      sent++;
    } catch (error) {
      log.error({ err: error, contactId: contact.id }, "Error sending template to contact");
      failed.push(contact.id);
    }
  }

  const skipped = req.body.contactIds.length - contacts.length;
  return res.code(200).send({ sent, failed, skipped });
}

const getLatestStatus = (statusObjInput: unknown) => {
  // WaMessage.stats is a free-form Json? column — read via a documented cast.
  const statusObj = statusObjInput as {
    read?: unknown;
    delivered?: unknown;
    failed?: unknown;
    sent?: unknown;
  } | null;
  if (statusObj?.failed) return "failed";
  if (statusObj?.read) return "read";
  if (statusObj?.delivered) return "delivered";
  if (statusObj?.sent) return "sent";
  return "pending";
};

/**
 * Scoped through the message's org mapping (or its contact): `WaMessage` has no `orgId`
 * column. The handler this replaced filtered on one anyway, which Prisma rejects, and before
 * that it looked messages up by id alone — any key could read any org's delivery status.
 * Another org's message answers as an unknown one does.
 */
export async function getMessageStatusByIdExternalController(
  request: FastifyRequest<{
    Params: { messageId: string };
  }>,
  reply: FastifyReply,
) {
  const { messageId } = request.params;
  const { orgId } = request.user;
  const messageStatus = await prisma.waMessage.findFirst({
    where: {
      messageId,
      OR: [{ waMessageOrgTeamMaps: { some: { orgId } } }, { contact: { orgId } }],
    },
    select: {
      messageId: true,
      stats: true,
      errorMessage: true,
    },
    orderBy: { createdAt: "desc" },
  });
  if (!messageStatus) return reply.code(404).send({ message: "Message not found" });
  const status = getLatestStatus(messageStatus.stats);
  const response = {
    messageId: messageStatus.messageId,
    status,
    ...(status === "failed" ? { errorMessage: messageStatus.errorMessage } : {}),
  };

  return reply.code(200).send(response);
}
