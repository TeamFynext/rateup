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
} from "./settings.controller.js";
import { $lsRef } from "./settings.schema.js";

export async function LoyaltySettingsRoutes(server: FastifyInstance) {
  server.post(
    "/template",
    {
      preHandler: [checkIfCommandExistInAutomation],
      schema: {
        body: $lsRef("loyaltyTemplateSchema"),
      },
    },
    createLoyaltyTemplateHandler,
  );

  server.put(
    "/template/:id",
    {
      schema: {
        params: $lsRef("byIdSchema"),
        body: $lsRef("updateLoyaltyTemplateSchema"),
      },
    },
    updateLoyaltyTemplateHandler,
  );

  server.delete(
    "/template/:id",
    {
      schema: {
        params: $lsRef("byIdSchema"),
      },
    },
    deleteLoyaltyTemplateHandler,
  );

  server.get(
    "/template/:id",
    {
      schema: {
        params: $lsRef("byIdSchema"),
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
        body: $lsRef("eventTriggerSchema"),
      },
    },
    createEventTriggerHandler,
  );

  server.put(
    "/event-trigger/:id",
    {
      schema: {
        params: $lsRef("byIdSchema"),
        body: $lsRef("updateEventTriggerSchema"),
      },
    },
    updateEventTriggerHandler,
  );

  server.get(
    "/event-trigger/:id",
    {
      schema: {
        params: $lsRef("byIdSchema"),
      },
    },
    getEventTriggerHandler,
  );

  server.get(
    "/event-trigger/all",
    {
      schema: {
        querystring: $lsRef("programIdQuerySchema"),
      },
    },
    getAllEventTriggersHandler,
  );

  server.delete(
    "/event-trigger/:id",
    {
      schema: {
        params: $lsRef("byIdSchema"),
      },
    },
    deleteEventTriggerHandler,
  );
}
