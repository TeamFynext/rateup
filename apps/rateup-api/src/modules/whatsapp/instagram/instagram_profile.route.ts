import { FastifyInstance } from "fastify";

import {
  deleteInstagramIceBreakersHandler,
  deleteInstagramPersistentMenuHandler,
  getInstagramMediaHandler,
  getInstagramProfileHandler,
  getInstagramStoriesHandler,
  setInstagramIceBreakersHandler,
  setInstagramPersistentMenuHandler,
  syncInstagramIceBreakersHandler,
  syncInstagramPersistentMenuHandler,
} from "./instagram_profile.controller.js";
import { declareAccess } from "../../../authz/registry.js";

export async function instagramProfileRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });

  server.get("/:channelId", getInstagramProfileHandler);
  server.post("/:channelId/ice-breakers", setInstagramIceBreakersHandler);
  server.post("/:channelId/ice-breakers/sync", syncInstagramIceBreakersHandler);
  server.delete("/:channelId/ice-breakers", deleteInstagramIceBreakersHandler);
  server.post("/:channelId/persistent-menu", setInstagramPersistentMenuHandler);
  server.post("/:channelId/persistent-menu/sync", syncInstagramPersistentMenuHandler);
  server.delete("/:channelId/persistent-menu", deleteInstagramPersistentMenuHandler);

  server.get("/media/:ibaId", getInstagramMediaHandler);
  server.get("/stories/:ibaId", getInstagramStoriesHandler);
}
