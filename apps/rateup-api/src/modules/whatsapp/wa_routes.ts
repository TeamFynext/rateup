import { FastifyInstance } from "fastify";
import { waTemplatesRoutes } from "./messageTemplates/wa_templates.route";
import { waSettingsRoutes } from "./settings/wa_settings.route";
import { waSettingsSchema } from "./settings/wa_settings.schema";
import { waTemplateSchemas } from "./messageTemplates/wa_templates.schema";
import { waWebhookRoutes} from "./whatsappSurvey/wasurvey.route";

export async function whatsappRoutes(server: FastifyInstance) {
    const modules = [
        waSettingsSchema,
        waTemplateSchemas,
    ]
    for (const module of modules) {
        for (const schema of module) {
            server.addSchema(schema);
        }
    }
    server.register(waTemplatesRoutes, { prefix: "/templates" })
    server.register(waSettingsRoutes, { prefix: "/settings" })
    server.register(waWebhookRoutes, { prefix: "/webhook" })
}