import { MultipartFile } from "@fastify/multipart";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { getWaSettings } from "../settings/wa_settings.service.js";
import { callMetaApi } from "../wa_axios.js";
import { CreateWaTemplateInput } from "./wa_templates.schema.js";
import { generateTemplate, getFlowIdFromTemplateComponents } from "./wa_templates.utils.js";
import { getFlowWithSurveyTeamMapIds } from "../flows/flow.service.js";
import { createSession, deleteSession, sendMessage } from "../whatsappSurvey/wasurvey.service.js";
import {
  WaTemplateComponentType,
  WaTemplateStatus,
  WaTemplateSupportedFormats,
} from "../../../types/enums.js";
import { getFileUrlFromKey } from "../../../utils/upload/s3Upload.js";
import { createTemplateMessage } from "../whatsappSurvey/wasurvey.utils.js";
import { WaTemplateComponent } from "../../../types/whatsapp.types.js";
import { $Enums, TemplateType } from "../../../../generated/prisma/client.js";
import { SendTemplateHeaderComponent } from "../../../external/v1/wa-templates/wa_templates.external.schema.js";

/**
 * fetches templates from WhatsApp Business API
 * @returns
 */
export async function fetchTemplates(orgId: string, whatsappSettingsPhoneId?: string) {
  try {
    const waSettings = await getWaSettings(orgId, whatsappSettingsPhoneId);
    if (!waSettings) {
      throw new Error("No WhatsApp settings found for orgId " + orgId);
    }

    log.trace("Fetching templates from whatsapp");
    const res = await callMetaApi(
      `/${waSettings.wabaId}/message_templates`,
      "GET",
      waSettings.accessToken,
    );
    log.trace(" Templates fetched from whatsapp: %o", res.data.data.length);
    return res.data.data;
  } catch (e: any) {
    log.error("Error getting templates \n%o", e.response);
    return [];
  }
}

export async function fetchTemplate(
  templateName: string,
  orgId: string,
  whatsappSettingsPhoneId?: string,
) {
  try {
    const waSettings = await getWaSettings(orgId, whatsappSettingsPhoneId);
    log.trace("fetching template %s", templateName);
    const {
      data: { data: templates },
    } = await callMetaApi(
      `/${waSettings.wabaId}/message_templates?name=${templateName}`,
      "GET",
      waSettings.accessToken,
    );
    return templates[0];
  } catch (e) {
    log.error("Error fetching template %s \n%o", templateName, e);
  }
}

export async function getTemplatesByOrgId(orgId: string) {
  const templates = await prisma.waTemplate.findMany({
    where: {
      orgId: orgId,
    },
  });
  return templates as WaTemplateWithTypes[];
}

export async function getTemplatesByOrgIdAndTemplateType(
  orgId: string,
  templateType?: TemplateType,
) {
  const templates = await prisma.waTemplate.findMany({
    where: {
      orgId: orgId,
      ...(templateType ? { templateType } : {}),
    },
    select: {
      id: true,
      data: true,
      createdAt: true,
      templateType: true,
      whatsappSettingsPhoneId: true,
      WhatsappSettings: {
        select: {
          phoneDisplayName: true,
        },
      },
      _count: {
        select: {
          Campaign: true,
        },
      },
    },
  });
  return templates as WaTemplateWithTypes[];
}

export type templateData = {
  id: string;
  createdAt: Date;
  data: {
    components: WaTemplateComponent[];
    name: string;
    language: string;
  };
  acceptButton: string | null;
  defaultValues: {
    image: {
      link: string;
    };
    document: {
      link: string;
      filename: string;
    };
    video: {
      link: string;
    };
  } | null;
  orgId: string;
  templateType: $Enums.TemplateType;
  config: {
    price: number;
    name: string;
    tax: number;
  } | null;
  whatsappSettingsPhoneId: string | null;
};
export async function getTemplateByIdAndOrgId(id: string, orgId: string) {
  const template = await prisma.waTemplate.findFirst({
    where: {
      orgId: orgId,
      id,
    },
  });
  return template as templateData;
}

export async function getTemplateByNameAndOrgId(name: string, orgId: string) {
  const template = await prisma.waTemplate.findFirst({
    where: {
      orgId: orgId,
      data: {
        path: ["name"],
        equals: name,
      },
    },
  });
  return template;
}
export async function getDbTemplate(templateId: string) {
  try {
    const res = await prisma.waTemplate.findUnique({
      where: {
        id: templateId,
      },
    });
    return res as unknown as WaTemplateWithTypes;
  } catch (e: any) {
    log.error("Error getting template from db \n%o", e);
    return null;
  }
}

export async function getTemplateWithHSMId(hsmId: string) {
  try {
    const res = await prisma.waTemplate.findFirst({
      where: {
        data: {
          path: ["id"],
          equals: hsmId,
        },
      },
    });
    return res as unknown as WaTemplateWithTypes;
  } catch (e: any) {
    log.error("Error getting template from db \n%o", e);
    return null;
  }
}

/**
 * Creates a template using the WhatsApp Business API
 * @param template
 * @returns
 */
export async function createTemplate(
  orgId: string,
  template: any,
  whatsappSettingsPhoneId?: string,
) {
  const waSettings = await getWaSettings(orgId, whatsappSettingsPhoneId);
  if (!waSettings) {
    throw new Error("No WhatsApp settings found for orgId " + orgId);
  }
  const res = await callMetaApi(
    `/${waSettings.wabaId}/message_templates`,
    "POST",
    waSettings.accessToken,
    template,
  );

  if (res.status === 200) {
    log.trace("Template Created in whatsapp %o", res.data);
  } else {
    // TODO: Parse error and send status to client
    log.error("Error creating template in whatsapp res => %o,\ntemplate => %o", res.data, template);
    throw new Error("Error creating template in whatsapp");
  }
  return { ...template, ...res.data };
}

/**
 * Saves template to db
 * @param template
 * @param acceptButton
 * @param orgId
 * @returns
 */
export async function saveTemplate(
  template: any,
  orgId: string,
  defaultValues: WaTemplateDefaultValues = {},
  templateType?: TemplateType,
  config?: any,
  whatsappSettingsPhoneId?: string,
) {
  try {
    const res = await prisma.waTemplate.create({
      data: {
        data: template,
        acceptButton: "",
        orgId: orgId,
        defaultValues,
        templateType,
        config,
        whatsappSettingsPhoneId,
      },
    });
    log.trace("Template saved to db %o", res);
    return res;
  } catch (e: any) {
    log.error("Error saving template");
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
  log.trace("Sending Delete req %o", { templateId, templateName });
  try {
    const waSettings = await getWaSettings(orgId);
    const res = await callMetaApi(
      `/${waSettings.wabaId}/message_templates?hsm_id=${templateId}&name=${templateName}`,
      "DELETE",
      waSettings.accessToken,
    );
    log.trace("Template deleted from whatsapp %o", res.data);
    return true;
  } catch (e: any) {
    log.error("Error deleting template \n%o\n%o", e, e.response?.data);
    return false;
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
        id: templateId,
      },
    });
    return res;
  } catch (e: any) {
    log.error("Error deleting template from db");
    console.log(e);
  }
}

export async function updateTemplateInDb(
  templateId: string,
  template: any,
  defaultValues?: WaTemplateDefaultValues,
  templateType?: TemplateType,
  config?: any,
  whatsappSettingsPhoneId?: string,
) {
  log.trace(`Updating template %o`, { templateId, data: template });
  try {
    const res = await prisma.waTemplate.update({
      where: {
        id: templateId,
      },
      data: {
        data: template,
        defaultValues: defaultValues ? defaultValues : undefined,
        templateType,
        config,
        whatsappSettingsPhoneId,
      },
    });
    return res;
  } catch (e: any) {
    log.error("Error updating template in db \n%o", e);
  }
}

/**
 * Edits template in WhatsApp Business API
 * @param hsm_id
 * @param data
 */
export async function editTemplate(
  orgId: string,
  hsm_id: string,
  components: Array<any>,
  category: string,
  whatsappSettingsPhoneId?: string,
) {
  log.trace(`Updating template %o`, { templateId: hsm_id, components });
  try {
    const waSettings = await getWaSettings(orgId, whatsappSettingsPhoneId);
    const res = await callMetaApi(`/${hsm_id}`, "POST", waSettings.accessToken, {
      category,
      components,
    });
    if (res.status === 200) {
      log.trace("Template updated in whatsapp");
      return true;
    } else {
      log.error(
        "Error updating template in whatsapp res => %o,\ntemplate => %o",
        res.data,
        components,
      );
      return false;
    }
  } catch (e: any) {
    console.log(e?.response?.data);

    log.error("Error updating template in whatsapp \n%o", e);
    return false;
  }
}
/**
 * First updates template in WhatsApp Business API then updates in db
 */
export async function updateTemplate(templateId: string, data: CreateWaTemplateInput) {
  const template = await getDbTemplate(templateId);
  const formattedTemplate = generateTemplate(data);
  let res;
  switch (data.templateType) {
    case TemplateType.GENERAL_NOTIFICATION:
    case TemplateType.LOYALTY:
      res = await editTemplate(
        template.orgId,
        template.data.id,
        formattedTemplate.components,
        template.data.category,
        data.whatsappSettingsPhoneId ?? template.whatsappSettingsPhoneId,
      );
      if (res) {
        const updatedTemplate = await fetchTemplate(
          template.data.name,
          template.orgId,
          data.whatsappSettingsPhoneId ?? template.whatsappSettingsPhoneId,
        );
        res = await updateTemplateInDb(
          templateId,
          updatedTemplate,
          data.defaultValues as unknown as WaTemplateDefaultValues,
          data.templateType,
          undefined,
          data.whatsappSettingsPhoneId,
        );
        break;
      }
      break;
    case TemplateType.ORDER_DETAILS:
      res = await updateTemplateInDb(
        templateId,
        {
          ...formattedTemplate,
          status: WaTemplateStatus.APPROVED,
          id: "localTemplate",
        },
        data.defaultValues as unknown as WaTemplateDefaultValues,
        data.templateType,
        data.config,
        data.whatsappSettingsPhoneId,
      );
      break;
    default:
      res = await updateTemplateInDb(
        templateId,
        {
          ...formattedTemplate,
          components: formattedTemplate.components?.filter(
            (component) => component.type === WaTemplateComponentType.BODY,
          ),
          status: WaTemplateStatus.APPROVED,
          id: "localTemplate",
        },
        data.defaultValues as unknown as WaTemplateDefaultValues,
        data.templateType,
        data.config,
        data.whatsappSettingsPhoneId,
      );
      break;
  }
  return res;
}

/**
 * Syncs templates from WhatsApp Business API to db
 * @param orgId
 * @returns
 */
/**
 * Helper function to determine template type from WhatsApp template
 */
function inferTemplateType(template: any): TemplateType {
  // Check if it's a carousel template
  const hasCarousel = template.components?.some((c: any) => c.type?.toLowerCase() === "carousel");
  if (hasCarousel) {
    return TemplateType.CAROUSEL;
  }

  // Check category to determine type
  if (template.category === "MARKETING" || template.category === "UTILITY") {
    return TemplateType.GENERAL_NOTIFICATION;
  }

  // Default to GENERAL_NOTIFICATION for WhatsApp templates
  return TemplateType.GENERAL_NOTIFICATION;
}

/**
 * Helper function to extract default values from template components
 */
function extractDefaultValues(template: any): WaTemplateDefaultValues {
  const defaultValues: WaTemplateDefaultValues = {};

  const headerComponent = template.components?.find(
    (c: any) => c.type?.toLowerCase() === WaTemplateComponentType.HEADER,
  );

  if (headerComponent) {
    // Extract image link if present
    if (headerComponent.format === WaTemplateSupportedFormats.IMAGE) {
      if (headerComponent.example?.header_handle?.[0]) {
        defaultValues.image = {
          link: headerComponent.example.header_handle[0],
        };
      }
    }
    // Extract video link if present
    else if (headerComponent.format === WaTemplateSupportedFormats.VIDEO) {
      if (headerComponent.example?.header_handle?.[0]) {
        defaultValues.video = {
          link: headerComponent.example.header_handle[0],
        };
      }
    }
    // Extract document link if present
    else if (headerComponent.format === WaTemplateSupportedFormats.DOCUMENT) {
      if (headerComponent.example?.header_handle?.[0]) {
        defaultValues.document = {
          link: headerComponent.example.header_handle[0],
          filename: headerComponent.example?.header_text?.[0] || undefined,
        };
      }
    }
  }

  return defaultValues;
}

export async function syncTemplates(orgId: string, whatsappSettingsPhoneIds: string[] = []) {
  try {
    log.trace("Syncing templates for orgId %s", orgId);

    const phoneIdsToSync = whatsappSettingsPhoneIds.length ? whatsappSettingsPhoneIds : [undefined];
    const dbTemplates = await getTemplatesByOrgId(orgId);

    const templateByWaId = new Map<string, any>();
    const templateByNameAndPhone = new Map<string, any>();

    for (const dbTemplate of dbTemplates) {
      const dbWaTemplateId = dbTemplate?.data?.id;
      if (dbWaTemplateId) {
        templateByWaId.set(dbWaTemplateId, dbTemplate);
      }

      const key = `${dbTemplate?.data?.name ?? ""}|${dbTemplate?.whatsappSettingsPhoneId ?? ""}`;
      templateByNameAndPhone.set(key, dbTemplate);
    }

    let created = 0;
    let updated = 0;

    for (const whatsappSettingsPhoneId of phoneIdsToSync) {
      const waTemplates = await fetchTemplates(orgId, whatsappSettingsPhoneId);

      for (const wt of waTemplates) {
        const existingByWaId = wt?.id ? templateByWaId.get(wt.id) : null;
        const nameAndPhoneKey = `${wt?.name ?? ""}|${whatsappSettingsPhoneId ?? ""}`;
        const existingByNameAndPhone = templateByNameAndPhone.get(nameAndPhoneKey);
        const existingTemplate = existingByWaId ?? existingByNameAndPhone;

        if (existingTemplate) {
          await updateTemplateInDb(
            existingTemplate.id,
            wt,
            undefined,
            existingTemplate.templateType,
            existingTemplate.config,
            whatsappSettingsPhoneId,
          );
          updated += 1;
          continue;
        }

        const templateType = inferTemplateType(wt);
        const defaultValues = extractDefaultValues(wt);
        log.trace("Creating new template in DB: %s (type: %s)", wt.name, templateType);
        const createdTemplate = await saveTemplate(
          wt,
          orgId,
          defaultValues,
          templateType,
          undefined,
          whatsappSettingsPhoneId,
        );

        if (createdTemplate) {
          if (wt?.id) {
            templateByWaId.set(wt.id, createdTemplate);
          }
          const createdKey = `${wt?.name ?? ""}|${whatsappSettingsPhoneId ?? ""}`;
          templateByNameAndPhone.set(createdKey, createdTemplate);
          created += 1;
        }
      }
    }

    log.trace("Templates synced");
    return { success: true, created, updated };
  } catch (e: any) {
    log.error("Error syncing templates \n%o", e);
    return { success: false, created: 0, updated: 0 };
  }
}

export async function getUnregisteredTemplates(orgId: string) {
  const waTemplates = await fetchTemplates(orgId);
  const dbTemplates = await getTemplatesByOrgId(orgId);
  const registeredTemplateIds = dbTemplates.map((dt: any) => dt.data.id);
  const unregisteredTemplates = waTemplates.filter(
    (wt: any) =>
      !registeredTemplateIds.includes(wt.id) && // Filtering out already registered templates
      wt.components.find((c) => c.type.toLowerCase() === "buttons")?.buttons.length === 2, // Selecting templates with only 2 buttons. Filtering out the rest since it cant be used as template message.
  );
  return unregisteredTemplates;
}

export async function registerTemplatesInDb(dbTemplates: Array<any>, orgId: string) {
  await prisma.waTemplate.createMany({
    data: dbTemplates.map((dt: any) => {
      return {
        orgId: orgId,
        acceptButton: dt.acceptButton,
        data: dt.data,
      };
    }),
  });
}

export async function uploadFileToWaTemplate(file: MultipartFile, size: number, orgId: string) {
  const waSettings = await getWaSettings(orgId);
  const { accessToken } = waSettings;
  const appId = process.env.wa_app_id;

  if (!accessToken || !appId) {
    throw Error("AccessToken and AppId should be present in whatsapp settings");
  }
  const sessionRes = await callMetaApi(
    `/${appId}/uploads`,
    "POST",
    undefined,
    undefined,
    undefined,
    undefined,
    {
      file_name: file.filename,
      file_length: size,
      file_type: file.mimetype,
      access_token: accessToken,
    },
  );
  const uploadSessionId = sessionRes?.data?.id;
  const headers = {
    Authorization: `OAuth ${accessToken}`,
    "Content-Type": "application/octet-stream",
    file_offset: "0",
    "Content-Length": size?.toString(),
  };

  const imageUploadRes = callMetaApi(
    `/${uploadSessionId}`,
    "POST",
    undefined,
    file?.file,
    undefined,
    headers,
  );
  const data = (await imageUploadRes).data;
  log.trace("Image uploaded to whatsapp %o", data);
  const fileHandle = data?.h ?? "error";
  return { fileHandle, uploadSessionId };
}

// TODO: refactor
// things to do:
//   - create functions for creating flow & image components

interface SendTemplateToPhoneProps {
  orgId: string;
  dbTemplate: templateData;
  phone: string;
  teamId: string | undefined;
  header: SendTemplateHeaderComponent;
  userId: string;
}
export async function sendTemplateToPhone({
  orgId,
  dbTemplate,
  header,
  phone,
  teamId,
  userId,
}: SendTemplateToPhoneProps) {
  log.trace("Sending template to phone %s", phone);

  const { data, defaultValues } = dbTemplate;
  const components = [];
  if (header) {
    components.push(header);
  }

  const containsFlowButton = !!getFlowIdFromTemplateComponents(data.components);

  if (containsFlowButton) {
    components.push({
      type: "button",
      sub_type: "flow",
      index: 0,
      parameters: [
        {
          type: "action",
          action: {
            flow_token: phone,
          },
        },
      ],
    });

    const flowId = getFlowIdFromTemplateComponents(data.components);
    if (!flowId) {
      log.error("Flow id not found in template\n Template => %o", data);
      throw new Error("Flow id not found in template");
    }
    // getting flow with surveyTeamMapId
    const dbFlow = await getFlowWithSurveyTeamMapIds(orgId, flowId);
    if (!dbFlow) {
      log.error("Flow not found in db with id %s", flowId);
      throw new Error("Flow not found in db");
    }

    if (!teamId) {
      log.error("Team id not found in request");
      throw new Error("Team id not found in request");
    }
    const surveyTeamMap = dbFlow?.survey?.teams.find((t) => t.teamId === teamId)?.id;
    if (!surveyTeamMap) {
      log.error("Team not found in survey;\nteam => %s", teamId);
      throw new Error("Team not found in survey");
    }

    await deleteSession(orgId, phone);
    await createSession({
      phone,
      orgId,
      surveyTeamMapId: surveyTeamMap,
      language: dbFlow?.survey?.languages[0],
    });
    log.trace("Session created successfully");
  }

  const containsImageComponent =
    dbTemplate.data.components.find((c) => c.type.toLowerCase() === WaTemplateComponentType.HEADER)
      ?.format === `IMAGE`;
  const containsImageOverrideInRequest = header?.parameters?.some((p) => p.type === "image");
  if (
    containsImageComponent &&
    !containsImageOverrideInRequest // if the request has image then don't add default image
  ) {
    if (!components.some((c) => c.type === "header")) {
      if (defaultValues?.image?.link) {
        components.push({
          type: "header",
          parameters: [
            {
              type: "image",
              image: {
                link: getFileUrlFromKey(dbTemplate.defaultValues.image.link),
              },
            },
          ],
        });
      } else {
        throw new Error("Image not found in template. Please upload an image and try again");
      }
    } else {
      log.warn("A header component is already present in template");
    }
  }
  const templateQuery = {
    name: data?.name,
    language: {
      code: dbTemplate.data?.language,
    },
    components: components,
  };
  const templateMessage = createTemplateMessage(phone, templateQuery);
  await sendMessage(
    orgId,
    templateMessage,
    null,
    userId,
    undefined,
    undefined,
    undefined,
    teamId,
    "TEMPLATE",
    false,
    false,
  );
  log.trace("Template send to user successfully");
}

export async function getTemplateByTemplateType(templateType, orgId) {
  return await prisma.waTemplate.findMany({
    where: {
      templateType,
      orgId,
    },
  });
}
