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
      schema: {
        body: enableInboxAutomationSchema,
      },
    },
    enableInboxAutomationHandler,
  );
  server.get(
    "/",
    {
      schema: {
        querystring: getInboxAutomationQuerySchema,
      },
    },
    getInboxAutomationHandler,
  );
  server.put(
    "/",
    {
      schema: {
        body: updateInboxAutomationSchema,
      },
    },
    updateInboxAutomationHandler,
  );
  server.delete(
    "/",
    {
      schema: {
        querystring: deleteInboxAutomationQuerySchema,
      },
    },
    deleteInboxAutomationHandler,
  );
}
