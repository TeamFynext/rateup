import { MultipartFile } from "@fastify/multipart";
import { TemplateType } from "../../../../../../../../generated/prisma/client";
import { getWaSettings } from "../settings/wa_settings.service";
import { callWhatsappApi } from "../wa_axios";
import { CreateWaTemplateInput } from "./wa_templates.schema";
import {
  generateTemplate,
  getFlowIdFromTemplateComponents,
} from "./wa_templates.utils";
import { getFlowWithSurveyTeamMapIds } from "../flows/flow.service";
import {
  createSession,
  deleteSession,
  sendMessage,
} from "../whatsappSurvey/wasurvey.service";
import { createTemplateMessage } from "../whatsappSurvey/wasurvey.utils";
import { log } from "../../../../../../../utils/logger";
import prisma from "../../../../../../../utils/prisma";
import { SendTemplateHeaderComponent } from "../../../template/wa_templates.external.schema";
import {
  SubscriptionFeaturePathName,
  waMessageScheduleSource,
  WaTemplateComponentType,
  WaTemplateSupportedFormats,
} from "../../../../../../../types/enums";
import { getFileUrlFromKey } from "../../../../../../../utils/upload/s3Upload";
import { createWaMessageSchedule } from "../../../../../../whatsapp/wa_message_scheduler";
import { sendPaymentInitTemplate } from "../../../../../../whatsapp/automatedReply/wa_automatedReply.utils";
import { templateData } from "../../../../../../whatsapp/messageTemplates/wa_templates.service";
import { updateMonthlyStat } from "../../../../../../stats/stats.service";

/**
 * fetches templates from WhatsApp Business API
 * @returns
 */
export async function fetchTemplates(orgId: string) {
  try {
    const waSettings = await getWaSettings(orgId);
    if (!waSettings) {
      throw new Error("No WhatsApp settings found for orgId " + orgId);
    }

    log.trace("Fetching templates from whatsapp");
    const res = await callWhatsappApi(
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

export async function fetchTemplate(templateName: string, orgId: string) {
  try {
    const waSettings = await getWaSettings(orgId);
    log.trace("fetching template %s", templateName);
    const {
      data: { data: templates },
    } = await callWhatsappApi(
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
  return templates as unknown as WaTemplateWithTypes[];
}

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
export async function createTemplate(orgId: string, template: any) {
  const waSettings = await getWaSettings(orgId);
  const res = await callWhatsappApi(
    `/${waSettings.wabaId}/message_templates`,
    "POST",
    waSettings.accessToken,
    template,
  );

  if (res.status === 200) {
    log.trace("Template Created in whatsapp %o", res.data);
  } else {
    // TODO: Parse error and send status to client
    log.error(
      "Error creating template in whatsapp res => %o,\ntemplate => %o",
      res.data,
      template,
    );
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
) {
  try {
    const res = await prisma.waTemplate.create({
      data: {
        data: template,
        acceptButton: "",
        orgId: orgId,
        defaultValues,
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
export async function deleteTemplate(
  orgId: string,
  templateId: string,
  templateName: string,
) {
  log.trace("Sending Delete req %o", { templateId, templateName });
  try {
    const waSettings = await getWaSettings(orgId);
    const res = await callWhatsappApi(
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

export async function updateTemplateInDb(templateId: string, template: any) {
  log.trace(`Updating template %o`, { templateId, data: template });
  try {
    const res = await prisma.waTemplate.update({
      where: {
        id: templateId,
      },
      data: {
        data: template,
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
) {
  log.trace(`Updating template %o`, { templateId: hsm_id, components });
  try {
    const waSettings = await getWaSettings(orgId);
    const res = await callWhatsappApi(
      `/${hsm_id}`,
      "POST",
      waSettings.accessToken,
      { category, components },
    );
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
export async function updateTemplate(
  templateId: string,
  data: CreateWaTemplateInput,
) {
  const template = await getDbTemplate(templateId);
  const { components } = generateTemplate(data);
  const res = await editTemplate(
    template.orgId,
    template.data.id,
    components,
    template.data.category,
  );
  if (res) {
    const updatedTemplate = await fetchTemplate(
      template.data.name,
      template.orgId,
    );
    const res = await updateTemplateInDb(templateId, updatedTemplate);
    return res;
  } else {
    return null;
  }
}

/**
 * Syncs templates from WhatsApp Business API to db
 * @param orgId
 * @returns
 */
export async function syncTemplates(orgId: string) {
  try {
    log.trace("Syncing templates for orgId %s", orgId);
    const waTemplates = await fetchTemplates(orgId);
    const dbTemplates = await getTemplatesByOrgId(orgId);

    console.log(waTemplates, dbTemplates);
    let idToHSMIdMap = {};
    const waTemplateIds = dbTemplates.map((dt: any) => {
      idToHSMIdMap[dt.data.id] = dt.id;
      return dt.data.id;
    });
    for (let wt of waTemplates) {
      if (waTemplateIds.includes(wt.id)) {
        await updateTemplateInDb(idToHSMIdMap[wt.id], wt);
      }
    }
    log.trace("Templates synced");
    return true;
  } catch (e: any) {
    log.error("Error syncing templates \n%o", e);
    return false;
  }
}

export async function getUnregisteredTemplates(orgId: string) {
  const waTemplates = await fetchTemplates(orgId);
  const dbTemplates = await getTemplatesByOrgId(orgId);
  const registeredTemplateIds = dbTemplates.map((dt: any) => dt.data.id);
  const unregisteredTemplates = waTemplates.filter(
    (wt: any) =>
      !registeredTemplateIds.includes(wt.id) && // Filtering out already registered templates
      wt.components.find((c) => c.type.toLowerCase() === "buttons")?.buttons
        .length === 2, // Selecting templates with only 2 buttons. Filtering out the rest since it cant be used as template message.
  );
  return unregisteredTemplates;
}

export async function registerTemplatesInDb(
  dbTemplates: Array<any>,
  orgId: string,
) {
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

export async function uploadFileToWaTemplate(
  file: MultipartFile,
  size: number,
  orgId: string,
) {
  const fileLength = size;
  const fileType = file.mimetype;
  const waSettings = await getWaSettings(orgId);
  const { accessToken } = waSettings;
  const appId = process.env.wa_app_id;

  if (!accessToken || !appId) {
    throw Error("AccessToken and AppId should be present in whatsapp settings");
  }
  const imageUploadSessionRes = callWhatsappApi(
    `/${appId}/uploads?file_length=${fileLength}&file_type=${fileType}&access_token=${accessToken}`,
    "POST",
  );
  const response = (await imageUploadSessionRes).data;
  const headers = {
    Authorization: `OAuth ${accessToken}`,
    "Content-Type": "application/octet-stream",
    file_offset: "0",
  };
  const buff = await file.toBuffer();

  const imageUploadRes = callWhatsappApi(
    `/${response.id}`,
    "POST",
    undefined,
    buff,
    undefined,
    headers,
  );
  const data = (await imageUploadRes).data;
  log.trace("Image uploaded to whatsapp %o", data);
  const fileHandle = data?.h ?? "error";
  const uploadSessionId = response.id;
  return { fileHandle, uploadSessionId };
}

// TODO: refactor
// things to do:
//   - create functions for creating flow & image components

interface SendTemplateToPhoneProps {
  orgId: string;
  dbTemplate: templateData;
  phone: string;
  timeDelay: number; // number of minutes
  components: any[];
  surveyTeamMap?: string;
}
export async function sendTemplateToPhone({
  orgId,
  dbTemplate,
  phone,
  timeDelay,
  components,
  surveyTeamMap,
}: SendTemplateToPhoneProps) {
  dbTemplate.data.components.forEach((item) => {
    if (item.type?.toLowerCase() === WaTemplateComponentType.BUTTONS) {
      item?.buttons.forEach((button, idx) => {
        if (button.type === "URL" && button?.example?.length > 0) {
          components.push({
            type: "button",
            sub_type: "url",
            index: idx,
            parameters: [
              {
                type: "text",
                text: phone,
              },
            ],
          });
        }
      });
    }
  });

  const templateQuery = {
    name: dbTemplate.data?.name,
    language: {
      code: dbTemplate.data?.language,
    },
    components: components,
  };

  const defaultValue = dbTemplate?.data?.components?.find(
    (data) => data.example?.body_text,
  )?.example?.body_text?.[0];

  if (defaultValue?.length > 0) {
    let params = templateQuery?.components.find(
      (component) => component.type === "body",
    )?.parameters;
    params?.forEach((data, i) => {
      if (data?.text?.trim().length === 0) {
        data.text = defaultValue?.[i];
      }
    });
    if (!params) {
      templateQuery?.components?.push({
        type: "body",
        parameters: defaultValue?.map((data: string) => ({
          type: "text",
          text: data,
        })),
      });
    }
  }

  let templateMessage;
  if (dbTemplate.templateType === TemplateType.ORDER_DETAILS) {
    templateMessage = await sendPaymentInitTemplate(
      orgId,
      phone,
      templateQuery,
      dbTemplate,
    );
  } else {
    templateMessage = createTemplateMessage(phone, templateQuery);
  }

  let res;
  if (timeDelay) {
    res = await createWaMessageSchedule({
      phone,
      messageBody: templateMessage,
      orgId,
      waTemplateId: dbTemplate.id,
      surveyTeamMapId: surveyTeamMap,
      timeDelay,
      source: waMessageScheduleSource.ExternalApi,
    });
    log.trace("Template schedule created successfully");
  } else {
    res = await sendMessage(orgId, templateMessage);
    await updateMonthlyStat(SubscriptionFeaturePathName.Whatsapp, orgId);
    log.trace("Template send to user successfully");
  }
  return res;
}

interface TemplateComponentsProps {
  orgId: string;
  dbTemplate: templateData;
  header?: SendTemplateHeaderComponent;
  teamId?: string;
  body_variables?: string[];
}

export async function getTemplateComponents({
  orgId,
  dbTemplate,
  header,
  teamId,
  body_variables,
}: TemplateComponentsProps) {
  const components = [];
  if (header) {
    components.push(header);
  }
  let surveyTeamMap, dbFlow;
  const { data, defaultValues } = dbTemplate;
  const containsFlowButton = !!getFlowIdFromTemplateComponents(data.components);
  if (containsFlowButton) {
    const flowId = getFlowIdFromTemplateComponents(data.components);
    if (!flowId) {
      log.error(
        "Flow id not found in template\n Template => %o",
        data.components,
      );
      throw new Error("Flow id not found in template");
    }
    // getting flow with surveyTeamMapId
    dbFlow = await getFlowWithSurveyTeamMapIds(orgId, flowId);
    if (!dbFlow) {
      log.error("Flow not found in db with id %s", flowId);
      throw new Error("Flow not found in db");
    }

    if (!teamId) {
      log.error("Team id not found in request");
      throw new Error("Team id not found in request");
    }
    surveyTeamMap = dbFlow?.survey?.teams.find((t) => t.teamId === teamId)?.id;
    if (!surveyTeamMap) {
      log.error("Team not found in survey;\nteam => %s", teamId);
      throw new Error("Team not found in survey");
    }
  }

  const headerComponent = dbTemplate.data.components.find(
    (c) => c.type.toLowerCase() === WaTemplateComponentType.HEADER,
  );

  const format = headerComponent?.format;

  // Function to push a new HEADER component
  const addHeaderComponent = (format, link, filename = null) => {
    const newComponent = {
      type: WaTemplateComponentType.HEADER,
      parameters: [
        {
          type: format.toLowerCase(),
          [format.toLowerCase()]: {
            link,
            ...(filename && { filename }),
          },
        },
      ],
    };
    components.push(newComponent);
  };

  if (!components.some((c) => c.type === WaTemplateComponentType.HEADER)) {
    switch (format) {
      case WaTemplateSupportedFormats.IMAGE:
        if (defaultValues?.image?.link) {
          addHeaderComponent(
            WaTemplateSupportedFormats.IMAGE,
            getFileUrlFromKey(defaultValues.image.link),
          );
        } else {
          throw new Error(
            "Image not found in template. Please upload an image and try again",
          );
        }
        break;

      case WaTemplateSupportedFormats.DOCUMENT:
        if (defaultValues?.document?.link) {
          addHeaderComponent(
            WaTemplateSupportedFormats.DOCUMENT,
            getFileUrlFromKey(defaultValues.document.link),
            defaultValues?.document?.filename,
          );
        } else {
          throw new Error(
            "File not found in template. Please upload a document and try again",
          );
        }
        break;
      case WaTemplateSupportedFormats.VIDEO:
        if (defaultValues?.video?.link) {
          addHeaderComponent(
            WaTemplateSupportedFormats.VIDEO,
            getFileUrlFromKey(defaultValues.video.link),
          );
        } else {
          throw new Error(
            "Video not found in template. Please upload a video and try again",
          );
        }
        break;

      default:
        // Handle unsupported formats if needed
        break;
    }
  }

  return { components, containsFlowButton, surveyTeamMap, dbFlow };
}

export async function handleFlowComponents(
  phone,
  orgId,
  surveyTeamMap,
  dbFlow,
  components,
  timeDelay,
) {
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
  if (!timeDelay) {
    await deleteSession(orgId, phone);
    await createSession({
      phone: phone,
      orgId,
      surveyTeamMapId: surveyTeamMap,
      language: dbFlow?.survey?.languages[0],
    });
    log.trace("Session created successfully");
  }
  return components;
}

export async function sendTemplateToUserCore(
  orgId: string,
  templateId: string,
  phone: string,
  parameterData: any[],
  teamId?: string,
  userId?: string,
): Promise<void> {
  const dbTemplate = await getTemplateByIdAndOrgId(templateId, orgId);
  const { data, defaultValues } = dbTemplate;
  const components = [...parameterData]; // Clone parameter data
  log.trace("parameterData => %o", parameterData);

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
      throw new Error("Flow id not found in template");
    }

    const dbFlow = await getFlowWithSurveyTeamMapIds(orgId, flowId);
    if (!dbFlow) {
      throw new Error("Flow not found in db");
    }

    const surveyTeamMap = dbFlow?.survey?.teams.find(
      (t) => t.teamId === teamId,
    )?.id;
    if (!surveyTeamMap) {
      throw new Error("Team not found in survey");
    }

    await deleteSession(orgId, phone);
    await createSession({
      phone,
      orgId,
      surveyTeamMapId: surveyTeamMap,
      language: dbFlow?.survey?.languages[0],
    });
  }

  const headerComponent = dbTemplate.data.components.find(
    (c) => c.type.toLowerCase() === WaTemplateComponentType.HEADER,
  );

  const format = headerComponent?.format;

  // Function to push a new HEADER component
  const addHeaderComponent = (format, link, filename = null) => {
    const newComponent = {
      type: WaTemplateComponentType.HEADER,
      parameters: [
        {
          type: format.toLowerCase(),
          [format.toLowerCase()]: {
            link,
            ...(filename && { filename }),
          },
        },
      ],
    };
    components.push(newComponent);
  };

  if (!components.some((c) => c.type === WaTemplateComponentType.HEADER)) {
    switch (format) {
      case WaTemplateSupportedFormats.IMAGE:
        if (defaultValues?.image?.link) {
          addHeaderComponent(
            WaTemplateSupportedFormats.IMAGE,
            getFileUrlFromKey(defaultValues.image.link),
          );
        } else {
          throw new Error(
            "Image not found in template. Please upload an image and try again",
          );
        }
        break;

      case WaTemplateSupportedFormats.DOCUMENT:
        if (defaultValues?.document?.link) {
          addHeaderComponent(
            WaTemplateSupportedFormats.DOCUMENT,
            getFileUrlFromKey(defaultValues.document.link),
            defaultValues?.document?.filename,
          );
        } else {
          throw new Error(
            "File not found in template. Please upload a document and try again",
          );
        }
        break;
      case WaTemplateSupportedFormats.VIDEO:
        if (defaultValues?.video?.link) {
          addHeaderComponent(
            WaTemplateSupportedFormats.VIDEO,
            getFileUrlFromKey(defaultValues.video.link),
          );
        } else {
          throw new Error(
            "Video not found in template. Please upload a video and try again",
          );
        }
        break;

      default:
        // Handle unsupported formats if needed
        break;
    }
  }

  dbTemplate.data.components.forEach((item) => {
    if (item.type?.toLowerCase() === WaTemplateComponentType.BUTTONS) {
      item?.buttons.forEach((button, idx) => {
        if (button.type === "URL" && button?.example?.length > 0) {
          components.push({
            type: "button",
            sub_type: "url",
            index: idx,
            parameters: [
              {
                type: "text",
                text: phone,
              },
            ],
          });
        }
      });
    }
  });

  const templateQuery = {
    name: data?.name,
    language: {
      code: dbTemplate.data?.language,
    },
    components: components,
  };

  const defaultValue = dbTemplate?.data?.components?.find(
    (data) => data.example?.body_text,
  )?.example?.body_text?.[0];

  if (defaultValue?.length > 0) {
    let params = templateQuery?.components.find(
      (component) => component.type === "body",
    )?.parameters;
    params?.forEach((data, i) => {
      if (data?.text?.trim().length === 0) {
        data.text = defaultValue?.[i];
      }
    });
    if (!params) {
      templateQuery?.components?.push({
        type: "body",
        parameters: defaultValue?.map((data: string) => ({
          type: "text",
          text: data,
        })),
      });
    }
  }
  let templateMessage;
  if (dbTemplate.templateType === TemplateType.ORDER_DETAILS) {
    templateMessage = await sendPaymentInitTemplate(
      orgId,
      phone,
      templateQuery,
      dbTemplate,
    );
  } else {
    templateMessage = createTemplateMessage(phone, templateQuery);
  }
  await sendMessage(orgId, templateMessage, null, userId);
  await updateMonthlyStat(SubscriptionFeaturePathName.Whatsapp, orgId);
}
