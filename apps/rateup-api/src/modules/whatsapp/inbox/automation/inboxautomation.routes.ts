import { FastifyInstance } from "fastify";
import {
  enableInboxAutomationHandler,
  getInboxAutomationHandler,
  updateInboxAutomationHandler,
  deleteInboxAutomationHandler,
} from "./inboxautomation.controller.js";
import {
  updateInboxAutomationSchema,
  getInboxAutomationQuerySchema,
  deleteInboxAutomationQuerySchema,
  enableInboxAutomationSchema,
} from "./inboxautomation.schema.js";

export async function waAutomationRoutes(server: FastifyInstance) {
  server.post(
    "/enable",
    {
      config: { permission: "automation.manage" },
      schema: {
        body: enableInboxAutomationSchema,
      },
    },
    enableInboxAutomationHandler,
  );
  server.get(
    "/",
    {
      config: { permission: "automation.read" },
      schema: {
        querystring: getInboxAutomationQuerySchema,
      },
    },
    getInboxAutomationHandler,
  );
  server.put(
    "/",
    {
      config: { permission: "automation.manage" },
      schema: {
        body: updateInboxAutomationSchema,
      },
    },
    updateInboxAutomationHandler,
  );
  server.delete(
    "/",
    {
      config: { permission: "automation.manage" },
      schema: {
        querystring: deleteInboxAutomationQuerySchema,
      },
    },
    deleteInboxAutomationHandler,
  );
}
