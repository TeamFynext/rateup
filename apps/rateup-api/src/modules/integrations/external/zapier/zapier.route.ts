import { FastifyInstance } from "fastify";
import {
  addContactToGroupHandler,
  createTicketHandler,
  deleteContactHandler,
  getContactGroupsHandler,
  getContactHandler,
  getLifecycleHandler,
  getSampleDataForTriggerHandler,
  getTeamsHandler,
  getTicketBoardsByTeamIdHandler,
  getTicketColumnsByBoardIdHandler,
  inviteMemberHandler,
  sendTextMessageHandler,
  subscribeTriggerHandler,
  unsubscribeTriggerHandler,
  updateContactHandler,
  updateContactLabelsByIdHandler,
  zapierAuthenticationHandler,
} from "./zapier.controller.js";
import { createContactHandler } from "../../../contact/contact.controller.js";
import { $zapier } from "./zapier.schema.js";
import { $contactRef } from "../../../contact/contact.schema.js";
import { $Tref } from "../../../team/team.schema.js";
import { $BoardRef } from "../../../ticket/ticketBoard/board.schema.js";

export async function zapierRoutes(server: FastifyInstance) {
  //auth
  server.post("/auth", zapierAuthenticationHandler);
  //subscriptions for trigger
  server.post(
    "/subscribe",
    {
      schema: {
        response: {
          201: $zapier("successSchema"),
        },
        body: $zapier("triggerSubscriptionBodySchema"),
      },
    },
    subscribeTriggerHandler,
  );
  server.delete(
    "/subscribe",
    {
      schema: {
        response: {
          201: $zapier("successSchema"),
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
          201: $zapier("dropdownResponseSchema"),
        },
      },
    },
    getTeamsHandler,
  );
  server.get(
    "/ticket-boards",
    {
      schema: {
        querystring: $zapier("boardQuerySchema"),
        response: {
          201: $zapier("dropdownResponseSchema"),
        },
      },
    },
    getTicketBoardsByTeamIdHandler,
  );
  server.get(
    "/ticket-column",
    {
      schema: {
        querystring: $zapier("ticketColumnSchema"),
        response: {
          201: $zapier("dropdownResponseSchema"),
        },
      },
    },
    getTicketColumnsByBoardIdHandler,
  );
  server.get(
    "/group",
    {
      schema: {
        response: {
          201: $zapier("dropdownResponseSchema"),
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
        body: $zapier("sendMessageSchema"),
        response: {
          201: $zapier("successSchema"),
        },
      },
    },
    sendTextMessageHandler,
  );
  server.put(
    "/contact-lifecycle",
    {
      schema: {
        body: $zapier("contactLabelSchema"),
        response: {
          201: $zapier("contactLabelSchema"),
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
          201: $zapier("contactResponseSchema"),
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
          201: $zapier("contactResponseSchema"),
        },
      },
    },
    updateContactHandler,
  ); //also for close contact
  server.get(
    "/contact",
    {
      schema: {
        querystring: $zapier("contactSearchSchema"),
        response: {
          201: $zapier("contactSearchResponseSchema"),
        },
      },
    },
    getContactHandler,
  ); //search action
  server.delete(
    "/contact",
    {
      schema: {
        body: $zapier("contactSearchSchema"),
        response: {
          201: $zapier("contactResponseSchema"),
        },
      },
    },
    deleteContactHandler,
  );
  server.post(
    "/ticket",
    {
      schema: {
        response: {
          201: $zapier("ticketCardResponseSchema"),
        },
        body: $zapier("ticketCardSchema"),
      },
    },
    createTicketHandler,
  );

  server.post(
    "/add-group-member",
    {
      schema: {
        body: $zapier("newMemberToGroupShema"),
        response: {
          201: $zapier("successSchema"),
        },
      },
    },
    addContactToGroupHandler,
  );

  server.post(
    "/invite-member",
    {
      schema: {
        body: $zapier("inviteMemberRequestSchema"),
        response: {
          201: $zapier("successSchema"),
        },
      },
    },
    inviteMemberHandler,
  );
}
