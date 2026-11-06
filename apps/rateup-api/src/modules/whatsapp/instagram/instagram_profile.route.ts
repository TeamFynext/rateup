import { FastifyInstance } from "fastify";

import {
  deleteInstagramIceBreakersHandler,
  deleteInstagramPersistentMenuHandler,
  getInstagramLinkStatsHandler,
  getInstagramMediaHandler,
  getInstagramProfileHandler,
  getInstagramStoriesHandler,
  setInstagramIceBreakersHandler,
  setInstagramPersistentMenuHandler,
  syncInstagramIceBreakersHandler,
  syncInstagramPersistentMenuHandler,
} from "./instagram_profile.controller.js";
import { declareAccess } from "../../../authz/registry.js";
import {
  instagramIbaIdParamsSchema,
  instagramIceBreakersBodySchema,
  instagramPersistentMenuBodySchema,
  instagramProfileParamsSchema,
} from "./instagram_profile.schema.js";

export async function instagramProfileRoutes(server: FastifyInstance) {
  // Changing an account's ice breakers or menu is a channel setting, as for Messenger.
  declareAccess(server, { read: "channels.read", write: "channels.manage" });

  const params = instagramProfileParamsSchema;
  const ibaParams = instagramIbaIdParamsSchema;

  server.get("/:channelId", { schema: { params } }, getInstagramProfileHandler);
  server.post(
    "/:channelId/ice-breakers",
    { schema: { params, body: instagramIceBreakersBodySchema } },
    setInstagramIceBreakersHandler,
  );
  server.post(
    "/:channelId/ice-breakers/sync",
    { schema: { params } },
    syncInstagramIceBreakersHandler,
  );
  server.delete(
    "/:channelId/ice-breakers",
    { schema: { params } },
    deleteInstagramIceBreakersHandler,
  );
  server.post(
    "/:channelId/persistent-menu",
    { schema: { params, body: instagramPersistentMenuBodySchema } },
    setInstagramPersistentMenuHandler,
  );
  server.post(
    "/:channelId/persistent-menu/sync",
    { schema: { params } },
    syncInstagramPersistentMenuHandler,
  );
  server.delete(
    "/:channelId/persistent-menu",
    { schema: { params } },
    deleteInstagramPersistentMenuHandler,
  );

  server.get("/media/:ibaId", { schema: { params: ibaParams } }, getInstagramMediaHandler);
  server.get(
    "/links/:ibaId/stats",
    { schema: { params: ibaParams } },
    getInstagramLinkStatsHandler,
  );
  server.get("/stories/:ibaId", { schema: { params: ibaParams } }, getInstagramStoriesHandler);
}
