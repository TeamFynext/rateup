import { log } from "../../../utils/logger";
import prisma from "../../../utils/prisma";
import { getWaSettings } from "../settings/wa_settings.service";
import { callWhatsappApi } from "../wa_axios";
import { CreateWaTemplateFormattedInput, CreateWaTemplateInput, WaTemplateFormatted } from "./wa_templates.schema";
import { generateTemplate } from "./wa_templates.utils";


/**
 * fetches templates from WhatsApp Business API
 * @returns 
 */
export async function fetchTemplates(orgId: string) {
    try {
        const waSettings = await getWaSettings(orgId);
        if (!waSettings) {
            throw new Error("No WhatsApp settings found for orgId " + orgId)
        }

        log.trace("Fetching templates from whatsapp")
        const res = await callWhatsappApi(
            `/${waSettings.businessId}/message_templates`,
            "GET",
            waSettings.accessToken
        )
        log.trace(" Templates fetched from whatsapp: %o", res.data.data.length)
        return res.data.data
    } catch (e: any) {
        log.error("Error getting templates \n%o", e.response)
        return []
    }
}

export async function fetchTemplate(templateName: string, orgId: string) {
    try {
        const waSettings = await getWaSettings(orgId);
        log.trace('fetching template %s', templateName);
        const { data: { data: templates } } = await callWhatsappApi(
            `/${waSettings.businessId}/message_templates?name=${templateName}`,
            "GET",
            waSettings.accessToken
        )
        return templates[0]
    } catch (e) {
        log.error("Error fetching template %s \n%o", templateName, e)
    }
}

export async function getTemplatesByOrgId(orgId: string) {
    const templates = await prisma.waTemplate.findMany({
        where: {
            orgId: orgId
        }
    })
    return templates as WaTemplateWithTypes[];

}

export async function getTemplate(templateId: string) {
    try {
        const res = await prisma.waTemplate.findUnique({
            where: {
                id: templateId
            }
        })
        return res as WaTemplateWithTypes
    } catch (e: any) {
        log.error("Error getting template from db \n%o", e)
        return null
    }
}

export async function getTemplateWithHSMId(hsmId: string) {
    try {
        const res = await prisma.waTemplate.findFirst({
            where: {
                data: {
                    path: ['id'],
                    equals: hsmId
                }
            }
        })
        return res as WaTemplateWithTypes
    } catch (e: any) {
        log.error("Error getting template from db \n%o", e)
        return null
    }
}

/**
 * Creates a template using the WhatsApp Business API
 * @param template 
 * @returns 
 */
export async function createTemplate(orgId: string, template: CreateWaTemplateFormattedInput) {
    const waSettings = await getWaSettings(orgId);
    const res = await callWhatsappApi(
        `/${waSettings.businessId}/message_templates`,
        "POST",
        waSettings.accessToken,
        template
    )
    if (res.status === 200) {
        log.trace("Template Created in whatsapp %o", res.data)
    } else {
        // TODO: Parse error and send status to client
        log.error("Error creating template in whatsapp res => %o,\ntemplate => %o", res.data, template)
        throw new Error("Error creating template in whatsapp")
    }
    return { ...template, ...res.data }
}

/**
 * Saves template to db
 * @param template 
 * @param acceptButton 
 * @param orgId 
 * @returns 
 */
export async function saveTemplate(template: WaTemplateFormatted, acceptButton: string, orgId: string) {
    try {
        const res = await prisma.waTemplate.create({
            data: {
                data: template,
                acceptButton: acceptButton,
                orgId: orgId
            }
        })
        log.trace("Template saved to db %o", res)
        return res
    } catch (e: any) {
        log.error("Error saving template")
        console.log(e);
    }
}

/**
 * Sends delete request to WhatsApp Business API
 * @param orgId
 * @param templateId 
 * @param templateName 
 * @returns 
 */
export async function deleteTemplate(orgId: string, templateId: string, templateName: string) {
    log.trace("Sending Delete req %o", { templateId, templateName })
    try {
        const waSettings = await getWaSettings(orgId);
        const res = await callWhatsappApi(
            `/${waSettings.businessId}/message_templates?hsm_id=${templateId}&name=${templateName}`,
            "DELETE",
            waSettings.accessToken
        )
        log.trace("Template deleted from whatsapp %o", res.data)
        return true
    } catch (e: any) {
        log.error("Error deleting template \n%o", e.response.data)
        console.log(`TemplateId: ${templateId}, TemplateName: ${templateName}`)
        return false
    }
}

/**
 * Deletes template record from db
 * @param templateId 
 * @returns 
 */
export async function deleteTemplateFromDb(templateId: string) {
    try {
        const res = await prisma.waTemplate.delete({
            where: {
                id: templateId
            }
        })
        return res
    } catch (e: any) {
        log.error("Error deleting template from db")
        console.log(e);
    }
}

export async function updateTemplateInDb(templateId: string, template: WaTemplateFormatted) {
    log.trace(`Updating template %o`, { templateId, data: template })
    try {
        const res = await prisma.waTemplate.update({
            where: {
                id: templateId
            },
            data: {
                data: template
            }
        })
        return res
    } catch (e: any) {
        log.error("Error updating template in db \n%o", e)
    }
}

/**
 * Edits template in WhatsApp Business API
 * @param hsm_id 
 * @param data 
 */
export async function editTemplate(orgId: string, hsm_id: string, components: Array<any>) {

    log.trace(`Updating template %o`, { templateId: hsm_id, components })
    try {
        const waSettings = await getWaSettings(orgId);
        const res = await callWhatsappApi(
            `/${hsm_id}`,
            "POST",
            waSettings.accessToken,
            { components }
        )
        if (res.status === 200) {
            log.trace("Template updated in whatsapp")
            return true
        } else {
            log.error("Error updating template in whatsapp res => %o,\ntemplate => %o", res.data, components)
            return false
        }
    } catch (e: any) {
        log.error("Error updating template in whatsapp \n%o", e)
        return false
    }
}
/**
 * First updates template in WhatsApp Business API then updates in db
 */
export async function updateTemplate(templateId: string, data: CreateWaTemplateInput) {
    const template = await getTemplate(templateId);
    const { components } = generateTemplate(data)
    const res = await editTemplate(template.orgId, template.data.id, components)
    if (res) {
        const updatedTemplate = await fetchTemplate(template.data.name, template.orgId);
        const res = await updateTemplateInDb(templateId, updatedTemplate)
        return res
    } else {
        return null
    }
}

/**
 * Syncs templates from WhatsApp Business API to db
 * @param orgId 
 * @returns 
 */
export async function syncTemplates(orgId: string) {
    try {
        log.trace("Syncing templates for orgId %s", orgId)
        const waTemplates = await fetchTemplates(orgId);
        const dbTemplates = await getTemplatesByOrgId(orgId)

        console.log(waTemplates, dbTemplates)
        let idToHSMIdMap = {}
        const waTemplateIds = dbTemplates.map((dt: any) => {
            idToHSMIdMap[dt.data.id] = dt.id
            return dt.data.id
        });
        for (let wt of waTemplates) {
            if (waTemplateIds.includes(wt.id)) {
                await updateTemplateInDb(idToHSMIdMap[wt.id], wt)
            }
        }
        log.trace("Templates synced")
        return true
    } catch (e: any) {
        log.error("Error syncing templates \n%o", e)
        return false
    }
}

export async function getUnregisteredTemplates(orgId: string) {
    const waTemplates = await fetchTemplates(orgId);
    const dbTemplates = await getTemplatesByOrgId(orgId)
    const registeredTemplateIds = dbTemplates.map((dt: any) => dt.data.id);
    const unregisteredTemplates = waTemplates.filter(
        (wt: any) =>
            !registeredTemplateIds.includes(wt.id) // Filtering out already registered templates
            &&
            wt.components.find(c => c.type.toLowerCase() === 'buttons')?.buttons.length === 2 // Selecting templates with only 2 buttons. Filtering out the rest since it cant be used as template message.
    )
    return unregisteredTemplates
}

export async function registerTemplatesInDb(dbTemplates: Array<any>, orgId: string) {
    await prisma.waTemplate.createMany({
        data: dbTemplates.map((dt: any) => {
            return {
                orgId: orgId,
                acceptButton: dt.acceptButton,
                data: dt.data
            }
        })
    })
}