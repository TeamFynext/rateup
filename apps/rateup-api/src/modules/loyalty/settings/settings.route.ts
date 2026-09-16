import { FastifyInstance } from "fastify";
import {
  checkIfCommandExistInAutomation,
  createLoyaltyTemplateHandler,
  deleteLoyaltyTemplateHandler,
  getAllLoyaltyTemplateHandler,
  getLoyaltyTemplateHandler,
  updateLoyaltyTemplateHandler,
  createEventTriggerHandler,
  updateEventTriggerHandler,
  getEventTriggerHandler,
  getAllEventTriggersHandler,
  deleteEventTriggerHandler,
  saveEventMessageHandler,
  saveReminderHandler,
} from "./settings.controller.js";
import {
  loyaltyTemplateSchema,
  byIdSchema,
  updateLoyaltyTemplateSchema,
  eventTriggerSchema,
  updateEventTriggerSchema,
  programIdQuerySchema,
  eventMessageParamsSchema,
  eventMessageBodySchema,
  reminderBodySchema,
} from "./settings.schema.js";

export async function LoyaltySettingsRoutes(server: FastifyInstance) {
  server.post(
    "/template",
    {
      preHandler: [checkIfCommandExistInAutomation],
      schema: {
        body: loyaltyTemplateSchema,
      },
    },
    createLoyaltyTemplateHandler,
  );

  server.put(
    "/template/:id",
    {
      schema: {
        params: byIdSchema,
        body: updateLoyaltyTemplateSchema,
      },
    },
    updateLoyaltyTemplateHandler,
  );

  server.delete(
    "/template/:id",
    {
      schema: {
        params: byIdSchema,
      },
    },
    deleteLoyaltyTemplateHandler,
  );

  server.get(
    "/template/:id",
    {
      schema: {
        params: byIdSchema,
      },
    },
    getLoyaltyTemplateHandler,
  );

  server.get("/template/all", getAllLoyaltyTemplateHandler);

  // Event Trigger Routes
  server.post(
    "/event-trigger",
    {
      schema: {
        body: eventTriggerSchema,
      },
    },
    createEventTriggerHandler,
  );

  server.put(
    "/event-trigger/:id",
    {
      schema: {
        params: byIdSchema,
        body: updateEventTriggerSchema,
      },
    },
    updateEventTriggerHandler,
  );

  server.get(
    "/event-trigger/:id",
    {
      schema: {
        params: byIdSchema,
      },
    },
    getEventTriggerHandler,
  );

  server.get(
    "/event-trigger/all",
    {
      schema: {
        querystring: programIdQuerySchema,
      },
    },
    getAllEventTriggersHandler,
  );

  server.delete(
    "/event-trigger/:id",
    {
      schema: {
        params: byIdSchema,
      },
    },
    deleteEventTriggerHandler,
  );

  // The notification's text for one event, submitted to Meta in one step (Messages page).
  server.put(
    "/event-message/:eventType",
    {
      schema: {
        params: eventMessageParamsSchema,
        body: eventMessageBodySchema,
      },
    },
    saveEventMessageHandler,
  );

  // When a scheduled reminder sends (Reminders page). The words stay on the route above:
  // one message, one place to write it, whichever page schedules it.
  server.put(
    "/reminder/:eventType",
    {
      schema: {
        params: eventMessageParamsSchema,
        body: reminderBodySchema,
      },
    },
    saveReminderHandler,
  );
}
