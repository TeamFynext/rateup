import { FastifyInstance } from "fastify";

import { checkSession } from "../../../utils/checkSession.js";
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

export async function instagramProfileRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.get("/:whatsappSettingsId", getInstagramProfileHandler);
  server.post("/:whatsappSettingsId/ice-breakers", setInstagramIceBreakersHandler);
  server.post("/:whatsappSettingsId/ice-breakers/sync", syncInstagramIceBreakersHandler);
  server.delete("/:whatsappSettingsId/ice-breakers", deleteInstagramIceBreakersHandler);
  server.post("/:whatsappSettingsId/persistent-menu", setInstagramPersistentMenuHandler);
  server.post("/:whatsappSettingsId/persistent-menu/sync", syncInstagramPersistentMenuHandler);
  server.delete("/:whatsappSettingsId/persistent-menu", deleteInstagramPersistentMenuHandler);

  server.get("/media/:ibaId", getInstagramMediaHandler);
  server.get("/stories/:ibaId", getInstagramStoriesHandler);
}
