import { FastifyInstance } from "fastify";
import { $waTemplateExternalRef } from "./wa_templates.external.schema";
import {
  getTemplatesHandler,
  sendTemplateToContactHandler,
  sendTemplatesToContactGroupsHandler,
  sendTemplatesToContactsHandler,
} from "../internal-copy/whatsapp/messageTemplates/wa_templates.controller";

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
}
