import { FastifyInstance } from "fastify";
import {
  assignWaMessageHandler,
  assignConversationOwnerHandler,
  blockWhatsappUserHandler,
  bulkAssignWaMessageHandler,
  clearConversationMentionsHandler,
  reopenConversationHandler,
  createPrivateMessageHandler,
  setContactFavoriteHandler,
  setContactSpamHandler,
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
  exportWaMessageLogsHandler,
} from "./wamessage.controller.js";
import { byContactIdSchema } from "../../../contact/contact.schema.js";
import {
  blockUserSchema,
  bulkWaMessageAssignBody,
  assignOwnerBody,
  clearMentionsSchema,
  reopenConversationSchema,
  favoriteContactSchema,
  spamContactSchema,
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

  server.post(
    "/mentions/clear/:contactId",
    {
      schema: {
        params: byContactIdSchema,
        body: clearMentionsSchema,
      },
    },
    clearConversationMentionsHandler,
  );

  server.post(
    "/reopen/:contactId",
    {
      schema: {
        params: byContactIdSchema,
        body: reopenConversationSchema,
      },
    },
    reopenConversationHandler,
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
      config: { permission: "inbox.export" },
      schema: { querystring: waChatExportQuerySchema },
    },
    exportWhatsappChatsHandler,
  );
  server.get("/mediafile/:mediaId", getMediaFileByMediaId);

  server.post(
    "/assign",
    {
      config: { permission: "inbox.assign" },
      schema: {
        body: waMessageAssignBody,
      },
    },
    assignWaMessageHandler,
  );

  server.post(
    "/assign/owner",
    {
      config: { permission: "inbox.assign" },
      schema: {
        body: assignOwnerBody,
      },
    },
    assignConversationOwnerHandler,
  );

  server.post(
    "/assign-bulk",
    {
      config: { permission: "inbox.assign" },
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
    "/favorite",
    {
      schema: {
        body: favoriteContactSchema,
      },
    },
    setContactFavoriteHandler,
  );

  // Spam is contact-grained, unlike /favorite: it flags the person, not a ticket.
  server.post(
    "/spam",
    {
      config: { permission: "inbox.manage" },
      schema: {
        body: spamContactSchema,
      },
    },
    setContactSpamHandler,
  );

  server.post(
    "/block-user",
    {
      config: { permission: "inbox.manage" },
      schema: {
        body: blockUserSchema,
      },
    },
    blockWhatsappUserHandler,
  );

  server.post(
    "/unblock-user",
    {
      config: { permission: "inbox.manage" },
      schema: {
        body: blockUserSchema,
      },
    },
    unblockWhatsappUserHandler,
  );

  server.get(
    "/analytics",
    { config: { permission: "analytics.read" } },
    generateChatAnalyticsHandler,
  );
  server.post(
    "/generate-response",
    {
      schema: {
        body: generateInboxResponseBody,
      },
    },
    generateInboxResponseHandler,
  );
  server.get(
    "/message-logs",
    {
      config: { permission: "analytics.read" },
    },
    getWaMessageLogsHandler,
  );
  server.get(
    "/export-message-logs",
    {
      config: { permission: "inbox.export" },
    },
    exportWaMessageLogsHandler,
  );
}
