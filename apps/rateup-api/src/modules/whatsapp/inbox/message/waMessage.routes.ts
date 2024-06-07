import { FastifyInstance } from "fastify";
import {
  exportWhatsappChatsHandler,
  generateChatFilterDataHandler,
  getContactsWithLastMessageHandler,
  getFilteredContactsHandler,
  getWaMessagesByContactIdHandler,
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
}
