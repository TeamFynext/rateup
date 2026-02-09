/**
 * Instagram Automation Routes
 * HTTP endpoints for managing Instagram automations
 */

import { FastifyInstance } from "fastify";
import {
  getInstagramAutomationsHandler,
  getInstagramAutomationByIdHandler,
  createInstagramAutomationHandler,
  updateInstagramAutomationHandler,
  deleteInstagramAutomationHandler,
  initiateInstagramAutomationHandler,
} from "./instagram_automatedReply.controller.js";
import { checkSession } from "../../../utils/checkSession.js";

export async function instagramAutomationRoutes(server: FastifyInstance) {
  // Add authentication check to all routes
  server.addHook("preHandler", checkSession);

  // Get all Instagram automations for the organization
  server.get("/", {
    handler: getInstagramAutomationsHandler,
  });

  // Get specific Instagram automation by ID
  server.get("/:id", {
    handler: getInstagramAutomationByIdHandler,
  });

  // Create a new Instagram automation
  server.post("/", {
    handler: createInstagramAutomationHandler,
  });

  // Update an existing Instagram automation
  server.put("/:id", {
    handler: updateInstagramAutomationHandler,
  });

  // Delete an Instagram automation
  server.delete("/:id", {
    handler: deleteInstagramAutomationHandler,
  });

  // Manually trigger an Instagram automation for a specific user
  server.post("/:id/initiate", {
    handler: initiateInstagramAutomationHandler,
  });
}
