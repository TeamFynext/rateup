import { FastifyInstance } from "fastify";
import {
  getWaMessagesByWaContactIdHandler,
  sendNewWaMessageHandler,
} from "./wamessage.controller";
import { $waMessage } from "./wamessage.schema";

export async function waMessageRoutes(server: FastifyInstance) {
  server.get(
    "/:waContactId",
    {
      schema: {
        params: $waMessage("byWaContactId"),
      },
    },
    getWaMessagesByWaContactIdHandler,
  );
  server.post(
    "/:waContactId",
    {
      schema: {
        params: $waMessage("byWaContactId"),
      },
    },
    sendNewWaMessageHandler,
  );
}
