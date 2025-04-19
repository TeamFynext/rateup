import { FastifyInstance } from "fastify";
import {
  assignWaMessageHandler,
  exportWhatsappChatsHandler,
  generateChatFilterDataHandler,
  getAssignedUserForContactHandler,
  getContactsCountByInboxTabHandler,
  getFilteredContactsHandler,
  getMediaFileByMediaId,
  getWaMessagesByContactIdHandler,
  markMessagesAsReadHandler,
  sendNewWaMessageHandler,
} from "./wamessage.controller";
import { checkSession } from "../../../../utils/checkSession";
import { $contactRef } from "../../../contact/contact.schema";
import { $waMessage } from "./wamessage.schema";

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
}
