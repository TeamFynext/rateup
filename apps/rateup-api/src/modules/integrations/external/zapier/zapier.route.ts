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
import {
  boardQuerySchema,
  contactLabelSchema,
  contactResponseSchema,
  contactSearchResponseSchema,
  contactSearchSchema,
  dropdownResponseSchema,
  inviteMemberRequestSchema,
  newMemberToGroupShema,
  sendMessageSchema,
  successSchema,
  ticketCardResponseSchema,
  ticketCardSchema,
  ticketColumnSchema,
  triggerSubscriptionBodySchema,
} from "./zapier.schema.js";

export async function zapierRoutes(server: FastifyInstance) {
  /**
   * zapierAuthenticationHandler is written as a preHandler — it bcrypt-compares the
   * Bearer key against the named org's stored hash, assigns `request.user`, and
   * replies only for the /auth probe — but it was registered as the HANDLER of
   * POST /auth and nowhere else. Every other route in this tree therefore ran
   * unauthenticated while taking its organisation from the query string: contacts,
   * messaging, ticket creation and team invitations against any org on the
   * platform, chosen by whoever called. It is the hook it was always meant to be.
   * See issues.txt 26.1.
   *
   * The handlers still read `request.query.orgId`; that is now safe, because the
   * hook only lets the request through when the caller's key matches THAT org's
   * stored hash, and it sets request.user to the same org.
   */
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
    "/ticket-boards",
    {
      schema: {
        querystring: boardQuerySchema,
        response: {
          201: dropdownResponseSchema,
        },
      },
    },
    getTicketBoardsByTeamIdHandler,
  );
  server.get(
    "/ticket-column",
    {
      schema: {
        querystring: ticketColumnSchema,
        response: {
          201: dropdownResponseSchema,
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
    "/ticket",
    {
      schema: {
        response: {
          201: ticketCardResponseSchema,
        },
        body: ticketCardSchema,
      },
    },
    createTicketHandler,
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
