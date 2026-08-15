import { FastifyReply, FastifyRequest } from "fastify";
import type { OutgoingTemplateComponent } from "../../../types/whatsapp.types.js";
import {
  getMessageStatusByIdHandler,
  sendTemplateToUserCore,
} from "../../../modules/whatsapp/messageTemplates/wa_templates.controller.js";
import { TemplateTypeParamsSchema } from "../../../modules/whatsapp/messageTemplates/wa_templates.schema.js";
import { getTemplatesByOrgIdAndTemplateType } from "../../../modules/whatsapp/messageTemplates/wa_templates.service.js";
import { SendTemplateByNameToPhone, SendTemplateWithFile } from "./wa_templates.external.schema.js";
import { log } from "../../../utils/logger.js";
import { parsePhoneNumberWithError } from "libphonenumber-js";
import { getWaSettings } from "../../../modules/whatsapp/settings/wa_settings.service.js";
import { WaTemplateComponentType } from "../../../types/enums.js";
import { templateFileUploadSchema } from "./wa_templates.utils.js";
import FormData from "form-data";
import { callMetaApi } from "../../../modules/whatsapp/wa_axios.js";

export async function getTemplatesExternalController(
  request: FastifyRequest<{
    Querystring: TemplateTypeParamsSchema;
  }>,
  reply: FastifyReply,
) {
  const { orgId } = request.user;
  const templates = await getTemplatesByOrgIdAndTemplateType(orgId, request.query.templateType);
  reply.code(200).send(templates);
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
    log.info("🚀 ~ req.body - external: %o", req.body);
    const orgId = req.user.orgId;
    const userId = req.user.userId;
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
    rep
      .code(200)
      .send(timeDelay ? { status: response.status, scheduleId: response?.id } : response);
  } catch (error) {
    log.error({ err: error }, "Error sending template to contacts");
    if (error instanceof Error) {
      rep.code(400).send(error.message);
    } else {
      rep.code(500).send("Error sending template to contacts");
    }
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
    rep
      .code(200)
      .send(timeDelay ? { status: response.status, scheduleId: response?.id } : response);
  } catch (error) {
    log.error({ err: error }, "Error sending template to contacts");
    if (error instanceof Error) {
      rep.code(400).send(error.message);
    } else {
      rep.code(500).send("Error sending template to contacts");
    }
  }
}

export async function getMessageStatusByIdExternalController(
  request: Parameters<typeof getMessageStatusByIdHandler>[0],
  reply: FastifyReply,
) {
  return getMessageStatusByIdHandler(request, reply);
}
