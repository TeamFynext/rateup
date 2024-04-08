import { FastifyInstance } from "fastify";
import {
  getWaMessagesByWaContactIdHandler,
  sendNewWaMessageHandler,
} from "./wamessage.controller";
import { $waMessage } from "./wamessage.schema";
import { checkSession } from "../../../../utils/checkSession";

export async function waMessageRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
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
