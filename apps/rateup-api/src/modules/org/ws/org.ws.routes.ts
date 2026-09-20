import { FastifyInstance } from "fastify";
import {
  checkMobileId,
  checkWidgetToken,
  handleWebSocketConnection,
  orgWsAuthCheckHandler,
} from "./org.ws.controller.js";
import { checkSession } from "../../../utils/checkSession.js";
import { afterAuthIdParamsSchema } from "./org.ws.schema.js";
import { declareAccess } from "../../../authz/registry.js";
export async function orgWsRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });
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

  server.get<{
    Params: { afterAuthId: string };
    Querystring: { role?: string; accessToken?: string };
  }>(
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

  // The embedded support widget. A separate route because it authenticates on an api access
  // token in the query string rather than a dashboard session — see checkWidgetToken.
  server.get<{
    Params: { afterAuthId: string };
    Querystring: { role?: string; orgId?: string; accessToken?: string; contactId?: string };
  }>(
    "/:afterAuthId/widget",
    {
      config: { access: "public" },
      preHandler: checkWidgetToken,
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
      config: { access: "public" },
      preHandler: checkMobileId,
      websocket: true,
    },
    handleWebSocketConnection,
  );
}
