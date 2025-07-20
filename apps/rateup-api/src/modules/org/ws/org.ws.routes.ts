import { FastifyInstance } from "fastify";
import {
  handleWebSocketConnection,
  orgWsAuthCheckHandler,
} from "./org.ws.controller";
import { checkSession } from "../../../utils/checkSession";
import { $orgWsRef } from "./org.ws.schema";

export async function orgWsRoutes(server: FastifyInstance) {
  server.get(
    "/auth",
    {
      preHandler: checkSession,
    },
    orgWsAuthCheckHandler,
  );

  server.get(
    "/:afterAuthId",
    {
      preHandler: checkSession,
      websocket: true,
      schema: {
        params: $orgWsRef("afterAuthIdParamsSchema"),
      },
    },
    handleWebSocketConnection,
  );
}
