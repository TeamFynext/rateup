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
} from "./zapier.controller";
import { createContactHandler } from "../../../contact/contact.controller";
import { $zapier } from "./zapier.schema";
import { $contactRef } from "../../../contact/contact.schema";
import { $Tref } from "../../../team/team.schema";
import { $BoardRef } from "../../../ticket/ticketBoard/board.schema";

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
          201: $zapier("teamResponseSchema"),
        },
      },
    },
    getTeamsHandler,
  );
  server.get(
    "/ticket-boards",
    {
      schema: {
        querystring: $Tref("byTeamIdParamsSchema"),
        response: {
          201: $zapier("ticketBoardResponseSchema"),
        },
      },
    },
    getTicketBoardsByTeamIdHandler,
  );
  server.get(
    "/ticket-column",
    {
      schema: {
        querystring: $zapier("boardIdParamSchema"),
        response: {
          201: $zapier("ticketBoardResponseSchema"),
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
          201: $zapier("teamResponseSchema"),
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
        response: {
          201: $zapier("contactResponseSchema"),
        },
      },
    },
    getContactHandler,
  ); //search action
  server.delete(
    "/contact",
    {
      schema: {
        response: {
          201: $contactRef("byContactIdSchema"),
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
