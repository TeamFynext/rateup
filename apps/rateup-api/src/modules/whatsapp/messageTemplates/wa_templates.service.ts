import { log } from "../../../utils/logger";
import prisma from "../../../utils/prisma";
import { waAxios } from "../wa_axios";
import { CreateWaTemplateFormattedInput, CreateWaTemplateInput, WaTemplateFormatted } from "./wa_templates.schema";
import { generateTemplate } from "./wa_templates.utils";

const wa_business_id = process.env.WA_BUSINESS_ID;

/**
 * fetches templates from WhatsApp Business API
 * @returns 
 */
export async function fetchTemplates() {
    try {
        log.trace("Fetching templates from whatsapp")
        const res = await waAxios.get(
            `/${wa_business_id}/message_templates`,
        );
        log.trace(" Templates fetched from whatsapp %o", res.data.data)
        return res.data.data
    } catch (e: any) {
        log.error("Error getting templates \n%o", e.response)
        return []
    }
}

export async function fetchTemplate(templateName: string) {
    try {
        log.trace('fetching template %s', templateName);
        const { data: { data: templates } } = await waAxios.get(
            `${wa_business_id}/message_templates?name=${templateName}`
        )
        return templates[0]
    } catch (e) {
        log.error("Error fetching template %s \n%o", templateName, e)
    }
}

/**
 * Gets templates from db
 * @param teamId 
 * @returns 
 */
export async function getTemplates(teamIds: Array<string>) {
    try {
        const res = await prisma.waTemplate.findMany({
            where: {
                teamId: {
                    in: teamIds
                }
            }
        })
        return res
    } catch (e: any) {
        log.error("Error getting templates from db \n%o", e)
        return []
    }
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
export async function createTemplate(template: CreateWaTemplateFormattedInput) {
    try {
        const wa_business_id = process.env.WA_BUSINESS_ID;
        const res = await waAxios.post(
            `/${wa_business_id}/message_templates`,
            template
        );
        if (res.status === 200) {
            log.trace("Template Created in whatsapp %o", res.data)
        } else {
            // TODO: Parse error and send status to client
            log.error("Error creating template in whatsapp res => %o,\ntemplate => %o", res.data, template)
        }
        return { ...template, ...res.data }
    } catch (e: any) {
        log.error("Error creating template")
        console.log(e);
    }
}

/**
 * Saves template to db
 * @param template 
 * @param acceptButton 
 * @param teamId 
 * @returns 
 */
export async function saveTemplate(template: WaTemplateFormatted, acceptButton: string, teamId: string) {
    try {
        const res = await prisma.waTemplate.create({
            data: {
                data: template,
                acceptButton: acceptButton,
                teamId: teamId
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
 * @param templateId 
 * @param templateName 
 * @returns 
 */
export async function deleteTemplate(templateId: string, templateName: string) {
    log.trace("Sending Delete req %o", { templateId, templateName })
    try {
        const wa_business_id = process.env.WA_BUSINESS_ID;
        const res = await waAxios.delete(
            `/${wa_business_id}/message_templates?hsm_id=${templateId}&name=${templateName}`,
        );
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
export async function editTemplate(hsm_id: string, components: Array<any>) {
    log.trace(`Updating template %o`, { templateId: hsm_id, components })
    try {
        const res = await waAxios.post(
            `/${hsm_id}`,
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
    const template = await getTemplate(templateId) as any;
    const { components } = generateTemplate(data)
    const res = await editTemplate(template.data.id, components)
    if (res) {
        const updatedTemplate = await fetchTemplate(template.data.name);
        const res = await updateTemplateInDb(templateId, updatedTemplate)
        return res
    } else {
        return null
    }
}

export async function syncTemplates(teamIds: Array<string>) {
    try {
        log.trace("Syncing templates for teamIds %o", teamIds)
        const waTemplates = await fetchTemplates();
        const dbTemplates = await getTemplates(teamIds);

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