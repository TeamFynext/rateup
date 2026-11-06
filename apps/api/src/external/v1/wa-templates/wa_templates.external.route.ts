import { FastifyInstance } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import {
  getMessageStatusByIdExternalController,
  getTemplatesExternalController,
  sendTemplateByNameToPhoneExternalController,
  sendTemplateByNameToPhoneWithFileExternalController,
  sendTemplatesToContactsExternalController,
} from "./wa_templates.external.controller.js";
import fastifyMultipart from "@fastify/multipart";
import {
  sendTemplateByNameToPhone,
  sendTemplateToContactsParamsWithOrgId,
  sendTemplatesToContacts,
  messageStatusParams,
  dbTemplateResponse,
} from "./wa_templates.external.schema.js";
import { sendWithFileSchema } from "./wa_templates.schema.js";
import { declareExternalScopes } from "../../shared/scopes.js";

// @fastify/multipart's `attachFieldsToBody: "keyValues"` mode reads `part.value` back
// off the part after `onFile` runs to decide what lands in `request.body` for that
// field - a documented capability the `MultipartFile` type doesn't model.
async function onFile(part: MultipartFile & { value?: unknown }) {
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
  // Every route below names its own permission; these defaults only catch a new one.
  declareExternalScopes(server, { read: "templates.read", write: "inbox.reply" });

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
      config: { permission: "templates.read" },
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
      config: { permission: "inbox.reply", paid: true },
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
      config: { permission: "inbox.reply", paid: true },
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
      // A WhatsApp send like the others, so the WhatsApp feature covers it; a campaign key can too.
      config: { permission: ["inbox.reply", "campaigns.send"], paid: true },
      schema: {
        params: sendTemplateToContactsParamsWithOrgId,
        body: sendTemplatesToContacts,
        tags: ["WhatsApp/Template"],
        description: "Send a template to contacts",
        summary: "Send a template to contacts",
      },
    },
    sendTemplatesToContactsExternalController,
  );

  server.get(
    "/message/:messageId/status",
    {
      config: { permission: "inbox.read" },
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
