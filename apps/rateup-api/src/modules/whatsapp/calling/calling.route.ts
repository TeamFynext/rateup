import type { FastifyInstance } from "fastify";
import { declareAccess } from "../../../authz/registry.js";
import {
  acceptCallHandler,
  getCallOfferHandler,
  getCallPermissionHandler,
  getCallSettingsHandler,
  heartbeatCallHandler,
  listRingingCallsHandler,
  rejectCallHandler,
  requestCallPermissionHandler,
  startCallHandler,
  terminateCallHandler,
  updateCallSettingsHandler,
} from "./calling.controller.js";
import {
  acceptCallSchema,
  callIdParamsSchema,
  callPermissionQuerySchema,
  callSettingsParamsSchema,
  callSettingsSchema,
  requestCallPermissionSchema,
  startCallSchema,
} from "./calling.schema.js";

/** WhatsApp voice calls. Answering or placing a call is replying to the customer. */
export async function waCallingRoutes(server: FastifyInstance) {
  declareAccess(server, { read: "inbox.reply", write: "inbox.reply" });

  server.get("/ringing", listRingingCallsHandler);
  server.get("/:callId/offer", { schema: { params: callIdParamsSchema } }, getCallOfferHandler);
  server.post(
    "/:callId/accept",
    { schema: { params: callIdParamsSchema, body: acceptCallSchema } },
    acceptCallHandler,
  );
  server.post("/:callId/reject", { schema: { params: callIdParamsSchema } }, rejectCallHandler);
  server.post(
    "/:callId/terminate",
    { schema: { params: callIdParamsSchema } },
    terminateCallHandler,
  );
  server.post(
    "/:callId/heartbeat",
    { schema: { params: callIdParamsSchema } },
    heartbeatCallHandler,
  );
  server.post("/", { schema: { body: startCallSchema } }, startCallHandler);

  server.get(
    "/permission",
    { schema: { querystring: callPermissionQuerySchema } },
    getCallPermissionHandler,
  );
  server.post(
    "/permission/request",
    { schema: { body: requestCallPermissionSchema } },
    requestCallPermissionHandler,
  );

  // Per-number settings are channel configuration, not inbox work.
  server.get(
    "/settings/:phoneId",
    { schema: { params: callSettingsParamsSchema }, config: { permission: "channels.read" } },
    getCallSettingsHandler,
  );
  server.post(
    "/settings/:phoneId",
    {
      schema: { params: callSettingsParamsSchema, body: callSettingsSchema },
      config: { permission: "channels.manage" },
    },
    updateCallSettingsHandler,
  );
}
