/**
 * Instagram Automation Routes
 * HTTP endpoints for managing Instagram automations
 */

import { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import {
  getInstagramAutomationsHandler,
  getInstagramAutomationByIdHandler,
  createInstagramAutomationHandler,
  updateInstagramAutomationHandler,
  deleteInstagramAutomationHandler,
  initiateInstagramAutomationHandler,
} from "./instagram_automatedReply.controller.js";
import { checkSession } from "../../../utils/checkSession.js";
import {
  instagramAutomationIdParamSchema,
  createInstagramAutomationBodySchema,
  updateInstagramAutomationBodySchema,
  initiateInstagramAutomationBodySchema,
} from "./instagram_automatedReply.schema.js";

export async function instagramAutomationRoutes(server: FastifyInstance) {
  // Set up Zod validation
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  // Add authentication check to all routes
  server.addHook("preHandler", checkSession);

  // Get all Instagram automations for the organization
  server.get("/", {
    handler: getInstagramAutomationsHandler,
  });

  // Get specific Instagram automation by ID
  server.get("/:id", {
    schema: {
      params: instagramAutomationIdParamSchema,
    },
    handler: getInstagramAutomationByIdHandler,
  });

  // Create a new Instagram automation
  server.post("/", {
    schema: {
      body: createInstagramAutomationBodySchema,
    },
    handler: createInstagramAutomationHandler,
  });

  // Update an existing Instagram automation
  server.put("/:id", {
    schema: {
      params: instagramAutomationIdParamSchema,
      body: updateInstagramAutomationBodySchema,
    },
    handler: updateInstagramAutomationHandler,
  });

  // Delete an Instagram automation
  server.delete("/:id", {
    schema: {
      params: instagramAutomationIdParamSchema,
    },
    handler: deleteInstagramAutomationHandler,
  });

  // Manually trigger an Instagram automation for a specific user
  server.post("/:id/initiate", {
    schema: {
      params: instagramAutomationIdParamSchema,
      body: initiateInstagramAutomationBodySchema,
    },
    handler: initiateInstagramAutomationHandler,
  });
}
