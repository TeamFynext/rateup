import { FastifyInstance } from "fastify";
import {
  assignWaMessageHandler,
  blockWhatsappUserHandler,
  bulkAssignWaMessageHandler,
  createPrivateMessageHandler,
  exportWhatsappChatsHandler,
  generateChatAnalyticsHandler,
  generateChatFilterDataHandler,
  generateInboxResponseHandler,
  getAssignedUserForContactHandler,
  getContactsCountByInboxTabHandler,
  getFilteredContactsHandler,
  getMediaFileByMediaId,
  getWaMessagesByContactIdHandler,
  markMessagesAsReadHandler,
  sendNewWaMessageHandler,
  unblockWhatsappUserHandler,
} from "./wamessage.controller.js";
import { checkSession } from "../../../../utils/checkSession.js";
import { $contactRef } from "../../../contact/contact.schema.js";
import { $waMessage } from "./wamessage.schema.js";

export async function waMessageRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.get(
    "/:contactId",
    {
      schema: {
        params: $contactRef("byContactIdSchema"),
        querystring: $waMessage("PaginateQuerySchema"),
      },
    },
    getWaMessagesByContactIdHandler,
  );
  server.post(
    "/:contactId",
    {
      schema: {
        params: $contactRef("byContactIdSchema"),
        querystring: $waMessage("PaginateQuerySchema"),
      },
    },
    sendNewWaMessageHandler,
  );

  server.post(
    "/mark/:contactId",
    {
      schema: {
        params: $contactRef("byContactIdSchema"),
      },
    },
    markMessagesAsReadHandler,
  );

  server.get("/filterdata", generateChatFilterDataHandler);

  server.get(
    "/contactsfiltered",
    {
      schema: {
        querystring: $waMessage("waChatFilterQuerySchema"),
      },
    },
    getFilteredContactsHandler,
  );

  server.post(
    "/exportmessages",
    {
      schema: { querystring: $waMessage("waChatExportQuerySchema") },
    },
    exportWhatsappChatsHandler,
  );
  server.get("/mediafile/:mediaId", getMediaFileByMediaId);

  server.post(
    "/assign",
    {
      schema: {
        body: $waMessage("waMessageAssignBody"),
      },
    },
    assignWaMessageHandler,
  );

  server.post(
    "/assign-bulk",
    {
      schema: {
        body: $waMessage("bulkWaMessageAssignBody"),
      },
    },
    bulkAssignWaMessageHandler,
  );

  server.post(
    "/privatemessage/:contactId",
    {
      schema: {
        params: $contactRef("byContactIdSchema"),
      },
    },
    createPrivateMessageHandler,
  );

  server.get(
    "/assign/:contactId",
    {
      schema: {
        params: $contactRef("byContactIdSchema"),
      },
    },
    getAssignedUserForContactHandler,
  );

  server.get("/count", getContactsCountByInboxTabHandler);

  server.post(
    "/block-user",
    {
      schema: {
        body: $waMessage("blockUserSchema"),
      },
    },
    blockWhatsappUserHandler,
  );

  server.post(
    "/unblock-user",
    {
      schema: {
        body: $waMessage("blockUserSchema"),
      },
    },
    unblockWhatsappUserHandler,
  );

  server.get("/analytics", generateChatAnalyticsHandler);
  server.post(
    "/generate-response",
    {
      schema: {
        body: $waMessage("generateInboxResponseBody"),
      },
    },
    generateInboxResponseHandler,
  );
}
