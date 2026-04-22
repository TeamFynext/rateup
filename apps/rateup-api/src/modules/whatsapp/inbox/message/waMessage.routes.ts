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
  getWaMessageLogsHandler,
  getWaMessagesByContactIdHandler,
  markMessagesAsReadHandler,
  sendNewWaMessageHandler,
  unblockWhatsappUserHandler,
} from "./wamessage.controller.js";
import { byContactIdSchema } from "../../../contact/contact.schema.js";
import {
  blockUserSchema,
  bulkWaMessageAssignBody,
  generateInboxResponseBody,
  PaginateQuerySchema,
  waChatExportQuerySchema,
  waChatFilterQuerySchema,
  waMessageAssignBody,
} from "./wamessage.schema.js";

export async function waMessageRoutes(server: FastifyInstance) {
  server.get(
    "/:contactId",
    {
      schema: {
        params: byContactIdSchema,
        querystring: PaginateQuerySchema,
      },
    },
    getWaMessagesByContactIdHandler,
  );
  server.post(
    "/:contactId",
    {
      schema: {
        params: byContactIdSchema,
        querystring: PaginateQuerySchema,
      },
    },
    sendNewWaMessageHandler,
  );

  server.post(
    "/mark/:contactId",
    {
      schema: {
        params: byContactIdSchema,
      },
    },
    markMessagesAsReadHandler,
  );

  server.get("/filterdata", generateChatFilterDataHandler);

  server.get(
    "/contactsfiltered",
    {
      schema: {
        querystring: waChatFilterQuerySchema,
      },
    },
    getFilteredContactsHandler,
  );

  server.post(
    "/exportmessages",
    {
      schema: { querystring: waChatExportQuerySchema },
    },
    exportWhatsappChatsHandler,
  );
  server.get("/mediafile/:mediaId", getMediaFileByMediaId);

  server.post(
    "/assign",
    {
      schema: {
        body: waMessageAssignBody,
      },
    },
    assignWaMessageHandler,
  );

  server.post(
    "/assign-bulk",
    {
      schema: {
        body: bulkWaMessageAssignBody,
      },
    },
    bulkAssignWaMessageHandler,
  );

  server.post(
    "/privatemessage/:contactId",
    {
      schema: {
        params: byContactIdSchema,
      },
    },
    createPrivateMessageHandler,
  );

  server.get(
    "/assign/:contactId",
    {
      schema: {
        params: byContactIdSchema,
      },
    },
    getAssignedUserForContactHandler,
  );

  server.get("/count", getContactsCountByInboxTabHandler);

  server.post(
    "/block-user",
    {
      schema: {
        body: blockUserSchema,
      },
    },
    blockWhatsappUserHandler,
  );

  server.post(
    "/unblock-user",
    {
      schema: {
        body: blockUserSchema,
      },
    },
    unblockWhatsappUserHandler,
  );

  server.get("/analytics", generateChatAnalyticsHandler);
  server.post(
    "/generate-response",
    {
      schema: {
        body: generateInboxResponseBody,
      },
    },
    generateInboxResponseHandler,
  );
  server.get("/message-logs", getWaMessageLogsHandler);
}
