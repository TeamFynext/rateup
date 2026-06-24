import { FastifyInstance } from "fastify";
import {
  getErrorLogsExternalController,
  getMessageStatusByIdExternalController,
  getTemplatesExternalController,
  sendTemplateByNameToPhoneExternalController,
  sendTemplateByNameToPhoneWithFileExternalController,
} from "./wa_templates.external.controller.js";
import fastifyMultipart from "@fastify/multipart";
import {
  sendTemplateByNameToPhone,
  sendTemplateToContactsParamsWithOrgId,
  sendTemplatesToContacts,
  errorLogsQuery,
  messageStatusParams,
  dbTemplateResponse,
} from "./wa_templates.external.schema.js";
import { sendTemplatesToContactsHandler } from "../../../modules/whatsapp/messageTemplates/wa_templates.controller.js";
import { sendWithFileSchema } from "./wa_templates.schema.js";

async function onFile(part) {
  const buff = await part.toBuffer();
  part.value = {
    filename: part.filename,
    encoding: part.encoding,
    mimetype: part.mimetype,
    size: part?.file?.bytesRead,
    data: buff,
  };
}

export async function externalWaTemplateRoutes(server: FastifyInstance) {
  server.register(fastifyMultipart, {
    limits: {
      fileSize: 1048576 * 100,
    },
    throwFileSizeLimit: true,
    attachFieldsToBody: "keyValues",
    onFile,
  });

  server.get(
    "/",
    {
      schema: {
        tags: ["WhatsApp/Template"],
        description: "Get all templates",
        summary: "Get all templates",
        response: {
          200: dbTemplateResponse.array(),
        },
      },
    },
    getTemplatesExternalController,
  );

  server.post(
    "/send",
    {
      schema: {
        body: sendTemplateByNameToPhone,
        tags: ["WhatsApp/Template"],
        description: "Send a template to a phone number. Phone number should contain country code",
        summary: "Send a template to a phone number",
      },
    },
    sendTemplateByNameToPhoneExternalController,
  );

  server.post(
    "/send-with-file",
    {
      schema: {
        consumes: ["multipart/form-data"],
        body: sendWithFileSchema,
        tags: ["WhatsApp/Template"],
        description: "Send a template to a phone number. Phone number should contain country code",
        summary: "Send a template to a phone number",
      },
    },
    sendTemplateByNameToPhoneWithFileExternalController,
  );

  // server.post(
  //   "/:templateId/send/contact/:contactId",
  //   {
  //     schema: {
  //       params: sendTemplateToContactParamsWithOrgId,
  //       body: sendTemplateToContact,
  //       tags: ["WhatsApp/Template"],
  //       description: "Send a template to a contact. Supports variables in body",
  //       summary: "Send a template to a contact",
  //     },
  //   },
  //   sendTemplatesToContactsHandler,
  // );

  server.post(
    "/:templateId/send/contacts",
    {
      schema: {
        params: sendTemplateToContactsParamsWithOrgId,
        body: sendTemplatesToContacts,
        tags: ["WhatsApp/Template"],
        description: "Send a template to contacts",
        summary: "Send a template to contacts",
      },
    },
    sendTemplatesToContactsHandler,
  );

  server.get(
    "/errors",
    {
      schema: {
        querystring: errorLogsQuery,
        tags: ["WhatsApp/Template"],
        description: "Get all error logs with optional date filtering",
        summary: "Get error logs",
      },
    },
    getErrorLogsExternalController,
  );

  server.get(
    "/message/:messageId/status",
    {
      schema: {
        params: messageStatusParams,
        tags: ["WhatsApp/Template"],
        description: "Get status of a message by messageId",
        summary: "Get message status",
      },
    },
    getMessageStatusByIdExternalController,
  );
}
