import { FastifyInstance } from "fastify";
import {
  exportWhatsappChatsHandler,
  generateChatFilterDataHandler,
  getContactsWithLastMessageHandler,
  getFilteredContactsHandler,
  getMediaFileByMediaId,
  getMessageCountHandler,
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

  server.get("/contacts", getContactsWithLastMessageHandler);
  server.get("/messagecount", getMessageCountHandler);
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

  server.post(
    "/exportmessages",
    {
      schema: { querystring: $waMessage("waChatExportQuerySchema") },
    },
    exportWhatsappChatsHandler,
  );
  server.get("/mediafile/:mediaId", getMediaFileByMediaId);
}
