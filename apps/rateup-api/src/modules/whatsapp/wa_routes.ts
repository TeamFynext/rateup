import { FastifyInstance } from "fastify";
import { waTemplatesRoutes } from "./messageTemplates/wa_templates.route";

// TODO: move whatsappSurvey under whatsapp
export async function whatsappRoutes(server: FastifyInstance) {
    server.register(waTemplatesRoutes, { prefix: "/templates" })
}