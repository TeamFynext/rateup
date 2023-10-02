import { FastifyInstance } from "fastify";
import { waTemplatesRoutes } from "./messageTemplates/wa_templates.route";
import { waSettingsRoutes } from "./settings/wa_settings.route";
import { waSettingsSchema } from "./settings/wa_settings.schema";
import { waTemplateSchemas } from "./messageTemplates/wa_templates.schema";
import { waWebhookRoutes, whatsappSurveyRoutes } from "./whatsappSurvey/wasurvey.route";
import { wasurveySchemas } from "./whatsappSurvey/wasurvey.schema";
import { waCustomerRoutes } from "./customer/waCustomer/waCustomer.route";
import { waCustomerGroupRoutes } from "./customer/waCustomerGroup/waCustomerGroup.route";
import { waCustomerSchemas } from "./customer/waCustomer/waCustomer.schema";
import { waCustomerGroupSchemas } from "./customer/waCustomerGroup/waCustomerGroup.schema";

export async function whatsappRoutes(server: FastifyInstance) {
    const modules = [
        waSettingsSchema,
        waTemplateSchemas,
        wasurveySchemas,
        waCustomerGroupSchemas,
        waCustomerSchemas,
    ]
    for (const module of modules) {
        for (const schema of module) {
            server.addSchema(schema);
        }
    }
    server.register(waTemplatesRoutes, { prefix: "/templates" })
    server.register(waSettingsRoutes, { prefix: "/settings" })
    server.register(whatsappSurveyRoutes, { prefix: "/survey" })
    server.register(waWebhookRoutes, { prefix: "/webhook" })
    server.register(waCustomerRoutes, { prefix: "/waCustomer" })
    server.register(waCustomerGroupRoutes, { prefix: "/waCustomerGroup" })

}