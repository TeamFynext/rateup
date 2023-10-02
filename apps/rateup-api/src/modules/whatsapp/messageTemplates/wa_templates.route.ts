import { FastifyInstance } from "fastify";
import { createTemplateHandler, deleteTemplateHandler, getTemplatesHandler, syncTemplatesHandler, updateTemplateHandler } from "./wa_templates.controller";
import { $WTref } from "./wa_templates.schema";

export async function waTemplatesRoutes(server: FastifyInstance) {

  server.get(
    "/",
    getTemplatesHandler
  );

  server.post(
    "/",
    {
      schema: {
        body: $WTref("waTemplateInputSchema"),
      }
    },
    createTemplateHandler
  );

  server.put(
    "/:templateId",
    {
      schema: {
        params: $WTref('byTemplateIdParamsSchema'),
        body: $WTref('waTemplateInputSchema')
      }
    },
    updateTemplateHandler
  )

  server.delete(
    "/:templateId",
    {
      schema: {
        params: $WTref("byTemplateIdParamsSchema"),
      }
    },
    deleteTemplateHandler
  );

  server.get(
    "/sync",
    syncTemplatesHandler
  )
}