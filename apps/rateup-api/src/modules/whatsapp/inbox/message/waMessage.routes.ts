import { FastifyInstance } from "fastify";
import {
  assignWaMessageHandler,
  exportWhatsappChatsHandler,
  generateChatFilterDataHandler,
  getAssignedUserForContactHandler,
  getContactsCountByInboxTabHandler,
  getFilteredContactsHandler,
  getInboxContactsHandler,
  getMediaFileByMediaId,
  getWaMessagesByContactIdHandler,
  getWaTicketsHandler,
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

  server.get("/filterdata", generateChatFilterDataHandler);
  server.get(
    "/tickets",
    {
      schema: {
        querystring: $waMessage("PaginateQuerySchema"),
      },
    },
    getWaTicketsHandler,
  );

  server.get(
    "/contactsfiltered",
    {
      schema: {
        querystring: $waMessage("waChatFilterQuerySchema"),
      },
    },
    getFilteredContactsHandler,
  );

  server.get(
    "/contacts/:waMessageAssignStatus",
    {
      schema: {
        params: $waMessage("waAssignStatusParams"),
        querystring: $waMessage("inboxContactQuery"),
      },
    },
    getInboxContactsHandler,
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
