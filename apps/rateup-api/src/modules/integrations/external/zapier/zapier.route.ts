import { FastifyInstance } from "fastify";
import {
  addContactToGroupHandler,
  assignContactLabelsHandler,
  createTicketHandler,
  deleteContactHandler,
  getContactGroupsHandler,
  getContactHandler,
  getSampleDataForTriggerHandler,
  getTeamsHandler,
  getTicketBoardsByTeamIdHandler,
  getTicketColumnsByBoardIdHandler,
  inviteMemberHandler,
  sendTextMessageHandler,
  subscribeTriggerHandler,
  unsubscribeTriggerHandler,
  updateContactHandler,
  zapierAuthenticationHandler,
} from "./zapier.controller";
import { createContactHandler } from "../../../contact/contact.controller";
import { $zapier } from "./zapier.schema";
import { $contactRef } from "../../../contact/contact.schema";

export async function zapierRoutes(server: FastifyInstance) {
  //auth
  server.post("/auth", zapierAuthenticationHandler);
  //subscriptions for trigger
  server.post(
    "/subscribe",
    {
      schema: {
        response: $zapier("successSchema"),
        body: $zapier("triggerSubscriptionBodySchema"),
      },
    },
    subscribeTriggerHandler,
  );
  server.delete(
    "/subscribe",
    {
      schema: {
        response: $zapier("successSchema"),
      },
    },
    unsubscribeTriggerHandler,
  );
  //trigger sample data
  server.get("/sample-data", getSampleDataForTriggerHandler);
  // add as a  trigger hidden & can be used as search action
  server.get(
    "/teams",
    {
      schema: {
        response: $zapier("teamResponseSchema"),
      },
    },
    getTeamsHandler,
  );
  server.get(
    "/ticket-boards",
    {
      schema: {
        response: $zapier("ticketBoardResponseSchema"),
      },
    },
    getTicketBoardsByTeamIdHandler,
  );
  server.get(
    "/ticket-column",
    {
      schema: {
        response: $zapier("ticketBoardResponseSchema"),
      },
    },
    getTicketColumnsByBoardIdHandler,
  );
  server.get(
    "/group",
    {
      schema: {
        response: $zapier("teamResponseSchema"),
      },
    },
    getContactGroupsHandler,
  );

  //actions
  server.post(
    "/send-message",
    {
      schema: {
        body: $zapier("sendMessageSchema"),
        response: $zapier("successSchema"),
      },
    },
    sendTextMessageHandler,
  );
  server.post(
    "/assign-label",
    {
      schema: {
        body: $zapier("contactLabelSchema"),
        response: $zapier("contactLabelSchema"),
      },
    },
    assignContactLabelsHandler,
  );
  server.post(
    "/contact",
    {
      schema: {
        response: $zapier("contactResponseSchema"),
      },
    },
    createContactHandler,
  );
  server.put(
    "/contact",
    {
      schema: {
        response: $zapier("contactResponseSchema"),
      },
    },
    updateContactHandler,
  ); //also for close contact
  server.get(
    "/contact",
    {
      schema: {
        response: $zapier("contactResponseSchema"),
      },
    },
    getContactHandler,
  ); //search action
  server.delete(
    "/contact",
    {
      schema: {
        response: $contactRef("byContactIdSchema"),
      },
    },
    deleteContactHandler,
  );
  server.post(
    "/ticket",
    {
      schema: {
        response: $zapier("ticketCardResponseSchema"),
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
        response: $zapier("successSchema"),
      },
    },
    addContactToGroupHandler,
  );

  server.post(
    "/invite-member",
    {
      schema: {
        body: $zapier("inviteMemberRequestSchema"),
        response: $zapier("successSchema"),
      },
    },
    inviteMemberHandler,
  );
}
