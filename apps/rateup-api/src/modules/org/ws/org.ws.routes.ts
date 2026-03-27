import { FastifyInstance } from "fastify";
import {
  checkMobileId,
  handleWebSocketConnection,
  orgWsAuthCheckHandler,
} from "./org.ws.controller.js";
import { checkSession } from "../../../utils/checkSession.js";
import { afterAuthIdParamsSchema } from "./org.ws.schema.js";
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
        params: afterAuthIdParamsSchema,
      },
    },
    handleWebSocketConnection,
  );

  server.get(
    "/:afterAuthId/mobilews",
    {
      preHandler: checkMobileId,
      websocket: true,
    },
    handleWebSocketConnection,
  );
}
