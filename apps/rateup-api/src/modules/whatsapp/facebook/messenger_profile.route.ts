import { FastifyInstance } from "fastify";

import { declareAccess } from "../../../authz/registry.js";
import {
  deleteMessengerGetStartedHandler,
  deleteMessengerGreetingHandler,
  deleteMessengerIceBreakersHandler,
  deleteMessengerPersistentMenuHandler,
  getMessengerProfileHandler,
  setMessengerGetStartedHandler,
  setMessengerGreetingHandler,
  setMessengerIceBreakersHandler,
  setMessengerPersistentMenuHandler,
} from "./messenger_profile.controller.js";
import {
  messengerGetStartedSchema,
  messengerGreetingSchema,
  messengerIceBreakersSchema,
  messengerPersistentMenuSchema,
  messengerProfileParamsSchema,
} from "./messenger_profile.schema.js";

/**
 * A Facebook Page's Messenger profile, by the Messenger channel's id. Changing it rewrites what
 * every visitor to the Page sees, so it is a channel setting: reading needs `channels.read`,
 * any change `channels.manage`.
 */
export async function messengerProfileRoutes(server: FastifyInstance) {
  declareAccess(server, { read: "channels.read", write: "channels.manage" });

  const params = messengerProfileParamsSchema;

  server.get("/:channelId", { schema: { params } }, getMessengerProfileHandler);

  server.put(
    "/:channelId/get-started",
    { schema: { params, body: messengerGetStartedSchema } },
    setMessengerGetStartedHandler,
  );
  server.delete(
    "/:channelId/get-started",
    { schema: { params } },
    deleteMessengerGetStartedHandler,
  );

  server.put(
    "/:channelId/greeting",
    { schema: { params, body: messengerGreetingSchema } },
    setMessengerGreetingHandler,
  );
  server.delete("/:channelId/greeting", { schema: { params } }, deleteMessengerGreetingHandler);

  server.put(
    "/:channelId/ice-breakers",
    { schema: { params, body: messengerIceBreakersSchema } },
    setMessengerIceBreakersHandler,
  );
  server.delete(
    "/:channelId/ice-breakers",
    { schema: { params } },
    deleteMessengerIceBreakersHandler,
  );

  server.put(
    "/:channelId/persistent-menu",
    { schema: { params, body: messengerPersistentMenuSchema } },
    setMessengerPersistentMenuHandler,
  );
  server.delete(
    "/:channelId/persistent-menu",
    { schema: { params } },
    deleteMessengerPersistentMenuHandler,
  );
}
