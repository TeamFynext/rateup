import { FastifyInstance } from "fastify";
import {
  addContactToGroupHandler,
  deleteContactHandler,
  getContactGroupsHandler,
  getContactHandler,
  getLifecycleHandler,
  getSampleDataForTriggerHandler,
  getTeamsHandler,
  inviteMemberHandler,
  sendTextMessageHandler,
  subscribeTriggerHandler,
  unsubscribeTriggerHandler,
  updateContactHandler,
  updateContactLabelsByIdHandler,
  zapierAuthenticationHandler,
} from "./zapier.controller.js";
import { createContactHandler } from "../../../contact/contact.controller.js";
import {
  contactLabelSchema,
  contactResponseSchema,
  contactSearchResponseSchema,
  contactSearchSchema,
  dropdownResponseSchema,
  inviteMemberRequestSchema,
  newMemberToGroupShema,
  sendMessageSchema,
  successSchema,
  triggerSubscriptionBodySchema,
} from "./zapier.schema.js";

export async function zapierRoutes(server: FastifyInstance) {
  server.addHook("preHandler", zapierAuthenticationHandler);

  //auth
  server.post("/auth", zapierAuthenticationHandler);
  //subscriptions for trigger
  server.post(
    "/subscribe",
    {
      schema: {
        response: {
          201: successSchema,
        },
        body: triggerSubscriptionBodySchema,
      },
    },
    subscribeTriggerHandler,
  );
  server.delete(
    "/subscribe",
    {
      schema: {
        response: {
          201: successSchema,
        },
      },
    },
    unsubscribeTriggerHandler,
  );
  //trigger sample data
  server.get("/sample-data", getSampleDataForTriggerHandler);
  // hidden triggers polling api for dropdown data
  server.get(
    "/teams",
    {
      schema: {
        response: {
          201: dropdownResponseSchema,
        },
      },
    },
    getTeamsHandler,
  );
  server.get(
    "/group",
    {
      schema: {
        response: {
          201: dropdownResponseSchema,
        },
      },
    },
    getContactGroupsHandler,
  );

  server.get("/lifecycle", getLifecycleHandler);
  //actions
  server.post(
    "/send-message",
    {
      schema: {
        body: sendMessageSchema,
        response: {
          201: successSchema,
        },
      },
    },
    sendTextMessageHandler,
  );
  server.put(
    "/contact-lifecycle",
    {
      schema: {
        body: contactLabelSchema,
        response: {
          201: contactLabelSchema,
        },
      },
    },
    updateContactLabelsByIdHandler,
  );
  server.post(
    "/contact",
    {
      schema: {
        response: {
          201: contactResponseSchema,
        },
      },
    },
    createContactHandler,
  );
  server.put(
    "/contact",
    {
      schema: {
        response: {
          201: contactResponseSchema,
        },
      },
    },
    updateContactHandler,
  ); //also for close contact
  server.get(
    "/contact",
    {
      schema: {
        querystring: contactSearchSchema,
        response: {
          201: contactSearchResponseSchema,
        },
      },
    },
    getContactHandler,
  ); //search action
  server.delete(
    "/contact",
    {
      schema: {
        body: contactSearchSchema,
        response: {
          201: contactResponseSchema,
        },
      },
    },
    deleteContactHandler,
  );
  server.post(
    "/add-group-member",
    {
      schema: {
        body: newMemberToGroupShema,
        response: {
          201: successSchema,
        },
      },
    },
    addContactToGroupHandler,
  );

  server.post(
    "/invite-member",
    {
      schema: {
        body: inviteMemberRequestSchema,
        response: {
          201: successSchema,
        },
      },
    },
    inviteMemberHandler,
  );
}
