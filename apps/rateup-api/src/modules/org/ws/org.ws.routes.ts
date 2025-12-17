import { FastifyInstance } from "fastify";
import {
  handleWebSocketConnection,
  orgWsAuthCheckHandler,
} from "./org.ws.controller.js";
import { checkSession } from "../../../utils/checkSession.js";
import { $orgWsRef } from "./org.ws.schema.js";

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
