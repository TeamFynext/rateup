import { FastifyInstance } from "fastify";
import { createTemplateHandler, deleteTemplateHandler, getTemplatesHandler, syncTemplatesHandler, updateTemplateHandler } from "./wa_templates.controller";
import { $WTref } from "./wa_templates.schema";
import { $Tref } from "../../team/team.schema";
import { verifyTeamAccess } from "../../team/team.auth";

export async function waTemplatesRoutes(server: FastifyInstance) {

  server.get(
    "/:teamId",
    {
      schema: {
        params: $Tref("byTeamIdParamsSchema")
      },
      preHandler: verifyTeamAccess
    },
    getTemplatesHandler
  );

  server.post(
    "/:teamId",
    {
      schema: {
        body: $WTref("waTemplateInputSchema"),
      },
      preHandler: verifyTeamAccess
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