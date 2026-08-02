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
  WaTemplateCategory,
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
/** Reads the API error payload off a thrown axios-style error, if present. */
function getErrorResponse(e: unknown): unknown {
  return e && typeof e === "object" && "response" in e ? (e as { response?: unknown }).response : e;
}

/** A guard against a broken cursor looping forever; ~100 x 100 templates. */
const MAX_TEMPLATE_PAGES = 100;

/**
 * Every template Meta holds for the account, following the paging cursor.
 *
 * Two things changed here (issues.txt 14.2 and 14.6):
 *
 *  - It no longer catches. It used to swallow EVERY failure — no settings, an
 *    expired token, a Meta outage — and return [], which syncTemplates then walked
 *    to report { success: true, created: 0, updated: 0 }. That is indistinguishable
 *    from an org genuinely already in sync, so "Sync templates" — the button a user
 *    presses when their templates look wrong — reported success while doing nothing.
 *  - It follows `paging.next`. Only the first page was ever read, so an account
 *    with more templates than Meta's page size silently synced a prefix of them.
 *    This also matters for 14.6's deletion reconciliation: "missing from Meta" is
 *    only meaningful once the read is known to be complete.
 */
export async function fetchTemplates(
  orgId: string,
  whatsappSettingsPhoneId?: string,
): Promise<WaMetaTemplate[]> {
  const waSettings = await getWaSettings(orgId, whatsappSettingsPhoneId);
  if (!waSettings) {
    throw new Error("No WhatsApp settings found for orgId " + orgId);
  }

  log.trace("Fetching templates from whatsapp");
  const templates: WaMetaTemplate[] = [];
  let url: string | undefined = `/${waSettings.wabaId}/message_templates?limit=100`;

  for (let page = 0; url && page < MAX_TEMPLATE_PAGES; page++) {
    const res = await callMetaApi(url, "GET", waSettings.accessToken);
    templates.push(...(res.data?.data ?? []));
    const next: string | undefined = res.data?.paging?.next;
    // Meta returns an absolute url; callMetaApi prefixes the graph base, so only
    // the path and query are handed back to it.
    url = next ? next.replace(/^https?:\/\/[^/]+\/v\d+(\.\d+)?/, "") : undefined;
  }

  log.trace(" Templates fetched from whatsapp: %o", templates.length);
  return templates;
}

export async function fetchTemplate(
  templateName: string,
  orgId: string,
  whatsappSettingsPhoneId?: string,
) {
  try {
    const waSettings = await getWaSettings(orgId, whatsappSettingsPhoneId);
    if (!waSettings) {
      throw new Error("No WhatsApp settings found for orgId " + orgId);
    }
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
    log.error({ err: e, templateName }, "Error fetching template");
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
  // This query selects a summary subset of WaTemplate's columns (no orgId,
  // acceptButton, defaultValues, etc.), so it doesn't fit WaTemplateWithTypes -
  // just return what Prisma actually infers for this select.
  return templates;
}

export interface templateData {
  id: string;
  createdAt: Date;
  data: {
    id?: string;
    components: WaTemplateComponent[];
    name: string;
    language: string;
    status?: WaTemplateStatus;
    category?: WaTemplateCategory;
  };
  acceptButton: string | null;
  defaultValues: WaTemplateDefaultValues | null;
  orgId: string;
  templateType: $Enums.TemplateType;
  config: {
    price: number;
    name: string;
    tax: number;
  } | null;
  whatsappSettingsPhoneId: string | null;
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
  return template as templateData | null;
}
/**
 * A template by id, scoped to the org asking.
 *
 * orgId is REQUIRED. This keyed on the id alone, and while updateTemplateHandler
 * and deleteTemplateHandler each compared orgId themselves afterwards,
 * saveTemplateAsDraftHandler did not — so naming another org's template id in the
 * body rewrote their template into a draft, replacing its components and status.
 * See issues.txt 14.3.
 */
export async function getDbTemplate(templateId: string, orgId: string) {
  try {
    const res = await prisma.waTemplate.findFirst({
      where: {
        id: templateId,
        orgId,
      },
    });
    return res as unknown as WaTemplateWithTypes | null;
  } catch (e) {
    log.error({ err: e }, "Error getting template from db \n%o");
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
  } catch (e) {
    log.error({ err: e }, "Error getting template from db \n%o");
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
  template: WaMetaTemplate,
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
  template: WaMetaTemplate,
  orgId: string,
  defaultValues: WaTemplateDefaultValues = {},
  templateType?: TemplateType,
  config?: WaTemplateConfig,
  whatsappSettingsPhoneId?: string,
) {
  try {
    const res = await prisma.waTemplate.create({
      data: {
        data: template as WaTemplateWithTypes["data"],
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
  } catch (e) {
    // Rethrown. This used to log to console.log and resolve to undefined, so
    // createTemplateHandler answered 200 "template created" having stored
    // nothing. See issues.txt 14.2 and 14.4.
    log.error({ err: e }, "Error saving template");
    throw e;
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
  // The number the template actually lives on. Without it this always resolved the
  // org's DEFAULT settings, unlike every neighbouring function — so deleting a
  // template on a second WhatsApp number was attempted against the first number's
  // business account, and Meta refused. See issues.txt 14.6.
  whatsappSettingsPhoneId?: string,
) {
  log.trace("Sending Delete req %o", { templateId, templateName });
  try {
    const waSettings = await getWaSettings(orgId, whatsappSettingsPhoneId ?? undefined);
    if (!waSettings) {
      throw new Error("No WhatsApp settings found for orgId " + orgId);
    }
    const res = await callMetaApi(
      `/${waSettings.wabaId}/message_templates?hsm_id=${templateId}&name=${templateName}`,
      "DELETE",
      waSettings.accessToken,
    );
    log.trace("Template deleted from whatsapp %o", res.data);
    return true;
  } catch (e) {
    log.error({ err: getErrorResponse(e) }, "Error deleting template");
    return false;
  }
}

/**
 * Deletes template record from db
 * @param templateId
 * @returns
 */
export async function deleteTemplateFromDb(templateId: string, orgId: string) {
  // Deliberately NOT caught. This used to swallow its own database failure to
  // console.log and resolve to undefined, so no caller could tell a deleted
  // template from one that is still there. See issues.txt 14.2 and 14.3.
  return await prisma.waTemplate.delete({
    where: {
      id: templateId,
      orgId,
    },
  });
}

export async function updateTemplateInDb(
  templateId: string,
  orgId: string,
  template: WaMetaTemplate,
  defaultValues?: WaTemplateDefaultValues,
  templateType?: TemplateType,
  config?: WaTemplateConfig,
  whatsappSettingsPhoneId?: string,
) {
  log.trace(`Updating template %o`, { templateId, data: template });
  // Deliberately NOT caught, and scoped. It used to swallow its own failure and
  // resolve to undefined, which updateTemplateHandler then reported as "You can
  // only edit an active template once in 24 hours" — see 14.10.
  // See issues.txt 14.2 and 14.3.
  return await prisma.waTemplate.update({
    where: {
      id: templateId,
      orgId,
    },
    data: {
      data: template as WaTemplateWithTypes["data"],
      defaultValues: defaultValues ? defaultValues : undefined,
      templateType,
      config,
      whatsappSettingsPhoneId,
    },
  });
}

/**
 * Edits template in WhatsApp Business API
 * @param hsm_id
 * @param data
 */
export async function editTemplate(
  orgId: string,
  hsm_id: string,
  components: Array<WaMetaTemplateComponent>,
  category: string,
  whatsappSettingsPhoneId?: string,
) {
  log.trace(`Updating template %o`, { templateId: hsm_id, components });
  try {
    const waSettings = await getWaSettings(orgId, whatsappSettingsPhoneId);
    if (!waSettings) {
      throw new Error("No WhatsApp settings found for orgId " + orgId);
    }
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
  } catch (e) {
    log.error({ err: getErrorResponse(e) }, "Error updating template in whatsapp");
    return false;
  }
}
/**
 * First updates template in WhatsApp Business API then updates in db
 */
export async function updateTemplate(
  templateId: string,
  orgId: string,
  data: CreateWaTemplateInput,
) {
  // Guarded: this used to read template.orgId off the result with no null check,
  // and getDbTemplate returns null for a template the org does not own — so an
  // unknown or foreign id gave a bare TypeError. See issues.txt 14.5.
  const template = await getDbTemplate(templateId, orgId);
  if (!template) {
    return null;
  }
  const formattedTemplate = generateTemplate(data);
  let res;
  switch (data.templateType) {
    case TemplateType.GENERAL_NOTIFICATION:
    case TemplateType.LOYALTY:
      if (!template) {
        throw new Error(`Template not found for id ${templateId}`);
      }
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
          orgId,
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
        orgId,
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
        orgId,
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
function inferTemplateType(template: WaMetaTemplate): TemplateType {
  // Check if it's a carousel template
  const hasCarousel = template.components?.some((c) => c.type?.toLowerCase() === "carousel");
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
function extractDefaultValues(template: WaMetaTemplate): WaTemplateDefaultValues {
  const defaultValues: WaTemplateDefaultValues = {};

  const headerComponent = template.components?.find(
    (c) => c.type?.toLowerCase() === WaTemplateComponentType.HEADER,
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
    // Every Meta template id seen across all the numbers synced in this pass, so
    // the reconciliation below can tell "gone" from "on another number".
    const seenWaTemplateIds = new Set<string>();

    for (const whatsappSettingsPhoneId of phoneIdsToSync) {
      const waTemplates = await fetchTemplates(orgId, whatsappSettingsPhoneId);
      for (const wt of waTemplates) {
        if (wt?.id) seenWaTemplateIds.add(wt.id);
      }

      for (const wt of waTemplates) {
        const existingByWaId = wt?.id ? templateByWaId.get(wt.id) : null;
        const nameAndPhoneKey = `${wt?.name ?? ""}|${whatsappSettingsPhoneId ?? ""}`;
        const existingByNameAndPhone = templateByNameAndPhone.get(nameAndPhoneKey);
        const existingTemplate = existingByWaId ?? existingByNameAndPhone;

        if (existingTemplate) {
          await updateTemplateInDb(
            existingTemplate.id,
            orgId,
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

    // Templates Meta no longer has are MARKED, not deleted. Campaigns can point at
    // a waTemplate row, so deleting one during a sync would break them — and a
    // partial read (before the cursor fix above) would have made every template
    // past the first page look deleted. Marking is reversible; the next sync that
    // does see the template clears the flag by updating it.
    // See issues.txt 14.6.
    const missingAtMeta = dbTemplates.filter(
      (dbTemplate) => dbTemplate?.data?.id && !seenWaTemplateIds.has(dbTemplate.data.id),
    );
    for (const dbTemplate of missingAtMeta) {
      await prisma.waTemplate.update({
        where: { id: dbTemplate.id },
        data: { data: { ...dbTemplate.data, status: WaTemplateStatus.DELETED } },
      });
    }
    if (missingAtMeta.length) {
      log.warn(
        { orgId, count: missingAtMeta.length },
        "Templates marked as deleted: they no longer exist at Meta",
      );
    }

    log.trace("Templates synced");
    return { success: true, created, updated, missingAtMeta: missingAtMeta.length };
  } catch (e) {
    // Reports the failure rather than a clean sync. See issues.txt 14.2.
    log.error({ err: e }, "Error syncing templates \n%o");
    return {
      success: false,
      created: 0,
      updated: 0,
      missingAtMeta: 0,
      message: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

/**
 * NOTE (issues.txt 14.6, still open): what this returns is RAW Meta templates —
 * flat objects with id/name/components — while registerTemplatesInDb and its
 * request schema expect `{ data, acceptButton }`. So GET /unregistered's output
 * cannot be fed straight to POST /register; the client has to re-wrap it, and
 * nothing says so. registerTemplatesInDb also records neither templateType nor
 * whatsappSettingsPhoneId, unlike saveTemplate. Agreeing one shape between the two
 * endpoints is a contract change and was left alone.
 */
export async function getUnregisteredTemplates(orgId: string) {
  const waTemplates = await fetchTemplates(orgId);
  const dbTemplates = await getTemplatesByOrgId(orgId);
  const registeredTemplateIds = dbTemplates.map((dt) => dt.data.id);
  // A Meta template always carries an id; the type allows its absence because
  // the same shape doubles as the create payload.
  const unregisteredTemplates = waTemplates.filter(
    (wt) =>
      !registeredTemplateIds.includes(wt.id ?? "") && // Filtering out already registered templates
      wt.components?.find((c) => c.type.toString().toLowerCase() === "buttons")?.buttons?.length ===
        2, // Selecting templates with only 2 buttons. Filtering out the rest since it cant be used as template message.
  );
  return unregisteredTemplates;
}

export async function registerTemplatesInDb(
  dbTemplates: Array<{ data: WaMetaTemplate; acceptButton?: string | null }>,
  orgId: string,
) {
  await prisma.waTemplate.createMany({
    data: dbTemplates.map((dt) => {
      return {
        orgId: orgId,
        acceptButton: dt.acceptButton,
        data: dt.data as WaTemplateWithTypes["data"],
      };
    }),
  });
}

export async function uploadFileToWaTemplate(
  file: MultipartFile,
  size: number,
  orgId: string,
  // The already-consumed bytes. The caller reads the stream to measure the real
  // size (14.10), which drains file.file — so the body has to come from here.
  body?: Buffer,
) {
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) {
    throw new Error("No WhatsApp settings found for orgId " + orgId);
  }
  const { accessToken, appId } = waSettings;

  if (!accessToken || !appId) {
    throw new Error("AccessToken and AppId should be present in whatsapp settings");
  }
  // Token as the accessToken argument, not a query param. The second call below
  // already used an OAuth header; only this one leaked. See issues.txt 14.15.
  const sessionRes = await callMetaApi(
    `/${appId}/uploads`,
    "POST",
    accessToken,
    undefined,
    undefined,
    undefined,
    {
      file_name: file.filename,
      file_length: size,
      file_type: file.mimetype,
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
    body ?? file?.file,
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
  header: SendTemplateHeaderComponent | undefined;
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
                link: getFileUrlFromKey(defaultValues.image.link),
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
    undefined,
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

export async function getTemplateByTemplateType(templateType: TemplateType, orgId: string) {
  return await prisma.waTemplate.findMany({
    where: {
      templateType,
      orgId,
    },
  });
}
