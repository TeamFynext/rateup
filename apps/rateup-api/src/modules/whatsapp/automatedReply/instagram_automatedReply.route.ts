/**
 * Routes for the Meta chatbot flows. Registered twice in wa_routes.ts: once at
 * `/instagram-automation` for Instagram and once at `/messenger-automation` for
 * Facebook Messenger.
 *
 * @deprecated for chatbot CRUD: the dashboard uses `/api/chatbots` (modules/chatbots).
 * Kept for older clients and for `/:id/initiate`, which has no replacement yet.
 */

import { FastifyInstance } from "fastify";
import { metaAutomationHandlers } from "./instagram_automatedReply.controller.js";
import {
  instagramAutomationIdParamSchema,
  createInstagramAutomationBodySchema,
  updateInstagramAutomationBodySchema,
  initiateMetaAutomationBodySchema,
  cloneMetaAutomationBodySchema,
} from "./instagram_automatedReply.schema.js";
import { declareAccess } from "../../../authz/registry.js";
import type { MetaAutomationPlatform } from "./instagram_automatedReply.service.js";

export async function metaAutomationRoutes(
  server: FastifyInstance,
  { platform }: { platform: MetaAutomationPlatform },
) {
  // Same permissions as the WhatsApp flowbot routes.
  declareAccess(server, { read: "automation.read", write: "automation.manage" });

  const handlers = metaAutomationHandlers(platform);

  // Get all automations for the organization
  server.get("/", {
    handler: handlers.list,
  });

  // Get a specific automation by ID
  server.get("/:id", {
    schema: {
      params: instagramAutomationIdParamSchema,
    },
    handler: handlers.getById,
  });

  // Create a new automation
  server.post("/", {
    schema: {
      body: createInstagramAutomationBodySchema,
    },
    handler: handlers.create,
  });

  // Update an existing automation
  server.put("/:id", {
    schema: {
      params: instagramAutomationIdParamSchema,
      body: updateInstagramAutomationBodySchema,
    },
    handler: handlers.update,
  });

  // Delete an automation
  server.delete("/:id", {
    schema: {
      params: instagramAutomationIdParamSchema,
    },
    handler: handlers.remove,
  });

  // Copy an automation, graph and all
  server.post("/:id/clone", {
    schema: {
      params: instagramAutomationIdParamSchema,
      body: cloneMetaAutomationBodySchema,
    },
    handler: handlers.clone,
  });

  // Manually trigger an automation for a specific user
  server.post("/:id/initiate", {
    schema: {
      params: instagramAutomationIdParamSchema,
      body: initiateMetaAutomationBodySchema,
    },
    handler: handlers.initiate,
  });
}
