import { FastifyReply, FastifyRequest } from "fastify";
import {
  getErrorLogsHandler,
  getMessageStatusByIdHandler,
  sendTemplateToUserCore,
} from "../../../modules/whatsapp/messageTemplates/wa_templates.controller.js";
import { TemplateTypeParamsSchema } from "../../../modules/whatsapp/messageTemplates/wa_templates.schema.js";
import { getTemplatesByOrgIdAndTemplateType } from "../../../modules/whatsapp/messageTemplates/wa_templates.service.js";
import {
  SendTemplateByNameToPhone,
  SendTemplateWithFile,
} from "./wa_templates.external.schema.js";
import { log } from "../../../utils/logger.js";
import { parsePhoneNumberWithError } from "libphonenumber-js";
import {
  getWaSettings,
  getWaSettingsByPhone,
} from "../../../modules/whatsapp/settings/wa_settings.service.js";
import { WaTemplateComponentType } from "../../../types/enums.js";
import { templateFileUploadSchema } from "./wa_templates.utils.js";
import FormData from "form-data";
import { callWhatsappApi } from "../../../modules/whatsapp/wa_axios.js";

export async function getTemplatesExternalController(
  request: FastifyRequest<{
    Querystring: TemplateTypeParamsSchema;
  }>,
  reply: FastifyReply,
) {
  console.log("hee");
  const { orgId } = request.user;
  const templates = await getTemplatesByOrgIdAndTemplateType(
    orgId,
    request.query.templateType,
  );
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
      from,
      buttonVariable,
    } = req.body;
    log.info("🚀 ~ req.body - external: %o", req.body);
    const orgId = req.user.orgId;
    const userId = req.user.userId;
    let reqNumber = "+" + req.body.phone;
    let phone = parsePhoneNumberWithError(reqNumber);
    if (phone.isValid() === false) {
      return rep.code(400).send("Invalid phone number.");
    }
    let whatsappSettingsPhoneId = undefined;
    if (from && from > 0) {
      let fromString = String(from);
      let whatsappPhone = fromString.startsWith("+")
        ? fromString
        : "+" + fromString;
      const waSettings = await getWaSettingsByPhone(whatsappPhone);
      if (waSettings) {
        whatsappSettingsPhoneId = waSettings.phoneId;
      }
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
      whatsappSettingsPhoneId,
      buttonVariable,
      true,
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
      from,
      buttonVariable,
    } = req.body;
    const bodyVariables = JSON.parse(body_variables?.[0] || "[]");

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
    let header: any = [];
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
              ...(type === "document"
                ? { filename: filename ? filename : file?.filename }
                : {}),
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
    let whatsappSettingsPhoneId = undefined;
    if (from && from > 0) {
      let fromString = String(from);
      let whatsappPhone = fromString.startsWith("+")
        ? fromString
        : "+" + fromString;
      const waSettings = await getWaSettingsByPhone(whatsappPhone);
      if (waSettings) {
        whatsappSettingsPhoneId = waSettings.phoneId;
      }
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
      whatsappSettingsPhoneId,
      buttonVariable,
      true,
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

export async function getErrorLogsExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return getErrorLogsHandler(request as any, reply);
}

export async function getMessageStatusByIdExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return getMessageStatusByIdHandler(request as any, reply);
}
