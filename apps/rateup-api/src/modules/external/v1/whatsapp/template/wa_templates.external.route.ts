import { FastifyInstance } from "fastify";
import {
  getTemplatesHandler,
  sendTemplatesToContactsHandler,
  sendTemplatesToContactGroupsHandler,
} from "../../../../whatsapp/messageTemplates/wa_templates.controller";
import { $WTref } from "../../../../whatsapp/messageTemplates/wa_templates.schema";
import { $waTemplateExternalRef } from "./wa_templates.external.schema";

export async function extWaTemplateRoutes(server: FastifyInstance) {
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
    "/:templateId/send/contacts",
    {
      schema: {
        params: $WTref("byTemplateIdParamsSchema"),
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
        params: $WTref("byTemplateIdParamsSchema"),
        body: $waTemplateExternalRef("sendTemplatesToContactGroups"),
        tags: ["WhatsApp/Template"],
        description: "Send a template to contact groups",
        summary: "Send a template to contact groups",
      },
    },
    sendTemplatesToContactGroupsHandler,
  );
}
