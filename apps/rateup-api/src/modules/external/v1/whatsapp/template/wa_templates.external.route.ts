import { FastifyInstance } from "fastify";
import { $waTemplateExternalRef } from "./wa_templates.external.schema";
import {
  getTemplatesHandler,
  sendTemplateByNameToPhoneHandler,
  sendTemplateToContactHandler,
  sendTemplatesToContactGroupsHandler,
  sendTemplatesToContactsHandler,
  getErrorLogsHandler,
  getMessageStatusByIdHandler,
  sendTemplateByNameToPhoneWithFileHandler,
} from "../internal-copy/whatsapp/messageTemplates/wa_templates.controller";
import fastifyMultipart from "@fastify/multipart";

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

export async function extWaTemplateRoutes(server: FastifyInstance) {
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
          200: {
            type: "array",
            items: $waTemplateExternalRef("dbTemplateResponse"),
          },
        },
      },
    },
    getTemplatesHandler,
  );

  server.post(
    "/send",
    {
      schema: {
        body: $waTemplateExternalRef("sendTemplateByNameToPhone"),
        tags: ["WhatsApp/Template"],
        description:
          "Send a template to a phone number. Phone number should contain country code",
        summary: "Send a template to a phone number",
      },
    },
    sendTemplateByNameToPhoneHandler,
  );
  server.post(
    "/send-with-file",
    {
      schema: {
        consumes: ["multipart/form-data"],
        body: {
          type: "object",
          required: ["templateName", "phone"],
          properties: {
            timeDelay: {
              type: "integer",
              minimum: 15,
            },
            templateName: {
              type: "string",
            },
            phone: {
              type: "number",
            },
            body_variables: {
              type: "array",
              items: { type: "string" },
            },
            teamId: {
              type: "string",
            },
            tag: {
              type: "string",
            },
            headerType: {
              type: "string",
            },
            filename: {
              type: "string",
            },
            file: {
              oneOf: [
                {
                  format: "binary",
                  type: "string",
                },
                {
                  type: "object",
                },
              ],
            },
          },
        },
        tags: ["WhatsApp/Template"],
        description:
          "Send a template to a phone number. Phone number should contain country code",
        summary: "Send a template to a phone number",
      },
    },
    sendTemplateByNameToPhoneWithFileHandler,
  );

  server.post(
    "/:templateId/send/contact/:contactId",
    {
      schema: {
        params: $waTemplateExternalRef("sendTemplateToContactParamsWithOrgId"),
        body: $waTemplateExternalRef("sendTemplateToContact"),
        tags: ["WhatsApp/Template"],
        description: "Send a template to a contact. Supports variables in body",
        summary: "Send a template to a contact",
      },
    },
    sendTemplateToContactHandler,
  );

  server.post(
    "/:templateId/send/contacts",
    {
      schema: {
        params: $waTemplateExternalRef("sendTemplateToContactsParamsWithOrgId"),
        body: $waTemplateExternalRef("sendTemplatesToContacts"),
        tags: ["WhatsApp/Template"],
        description: "Send a template to contacts",
        summary: "Send a template to contacts",
      },
    },
    sendTemplatesToContactsHandler,
  );

  server.post(
    "/:templateId/send/contact-groups",
    {
      schema: {
        params: $waTemplateExternalRef(
          "sendTemplateToContactGroupsParamsWithOrgId",
        ),
        body: $waTemplateExternalRef("sendTemplatesToContactGroups"),
        tags: ["WhatsApp/Template"],
        description: "Send a template to contact groups",
        summary: "Send a template to contact groups",
      },
    },
    sendTemplatesToContactGroupsHandler,
  );

  server.get(
    "/errors",
    {
      schema: {
        querystring: $waTemplateExternalRef("errorLogsQuery"),
        tags: ["WhatsApp/Template"],
        description: "Get all error logs with optional date filtering",
        summary: "Get error logs",
        // response: {
        //   200: {
        //     type: "array",
        //     items: $waTemplateExternalRef("errorLogResponse"),
        //   },
        // },
      },
    },
    getErrorLogsHandler,
  );

  server.get(
    "/message/:messageId/status",
    {
      schema: {
        params: $waTemplateExternalRef("messageStatusParams"),
        tags: ["WhatsApp/Template"],
        description: "Get status of a message by messageId",
        summary: "Get message status",
        // response: {
        //   200: $waTemplateExternalRef("messageStatusResponse"),
        // },
      },
    },
    getMessageStatusByIdHandler,
  );
}
