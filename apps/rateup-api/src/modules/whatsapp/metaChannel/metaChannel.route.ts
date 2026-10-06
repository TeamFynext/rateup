import { FastifyInstance } from "fastify";
import { declareAccess } from "../../../authz/registry.js";
import { handleWhatsappError } from "../wa_error_handler.js";
import {
  connectMetaChannelHandler,
  deleteMetaChannelHandler,
  getMetaChannelsHandler,
  metaChannelLoginHandler,
} from "./metaChannel.controller.js";
import {
  connectMetaChannelBodySchema,
  metaChannelListQuerySchema,
  metaChannelLoginBodySchema,
  metaChannelParamsSchema,
} from "./metaChannel.schema.js";

/** Messenger Pages and Instagram accounts, each connected independently of WhatsApp. */
export async function metaChannelRoutes(server: FastifyInstance) {
  // Same Graph API error mapping as the WhatsApp routes: Meta's user message, as a 400.
  server.setErrorHandler(handleWhatsappError);
  declareAccess(server, { read: "channels.read", write: "channels.manage" });

  server.get("/", { schema: { querystring: metaChannelListQuerySchema } }, getMetaChannelsHandler);
  server.post("/login", { schema: { body: metaChannelLoginBodySchema } }, metaChannelLoginHandler);
  server.post(
    "/connect",
    { schema: { body: connectMetaChannelBodySchema } },
    connectMetaChannelHandler,
  );
  server.delete(
    "/:channelId",
    { schema: { params: metaChannelParamsSchema } },
    deleteMetaChannelHandler,
  );
}
