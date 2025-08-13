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
      schema: {
        deprecated: true,
      },
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

  server.get(
    "/:afterAuthId/ws/:orgId",
    {
      websocket: true,
    },
    handleWebSocketConnection,
  );
}
