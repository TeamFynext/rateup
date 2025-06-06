import { Role, TemplateType } from "@prisma/client";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  SubscriptionFeaturePathName,
  waMessageScheduleSource,
  WaTemplateComponentType,
  WaTemplateStatus,
  WaTemplateSupportedFormats,
} from "../../../types/enums";
import { log } from "../../../utils/logger";
import { getOrgIdAndRole } from "../../user/user.service";
import {
  createSession,
  deleteSession,
  sendMessage,
} from "../whatsappSurvey/wasurvey.service";
import { createTemplateMessage } from "../whatsappSurvey/wasurvey.utils";
import {
  ByTemplateIdParamsSchema,
  CreateWaTemplateInput,
  RegisterTemplatesInDbBodySchema,
  TemplateTypeParamsSchema,
  WaTemplateFormatted,
  WaUserSendTemplateBodySchema,
} from "./wa_templates.schema";
import {
  createTemplate,
  deleteTemplate,
  deleteTemplateFromDb,
  fetchTemplate,
  getDbTemplate,
  getTemplateByIdAndOrgId,
  getTemplateByNameAndOrgId,
  getTemplateByTemplateType,
  getTemplatesByOrgId,
  getTemplatesByOrgIdAndTemplateType,
  getUnregisteredTemplates,
  registerTemplatesInDb,
  saveTemplate,
  sendTemplateToPhone,
  syncTemplates,
  updateTemplate,
  updateTemplateInDb,
  uploadFileToWaTemplate,
} from "./wa_templates.service";
import {
  generateTemplate,
  getFlowIdFromTemplateComponents,
  waAllowedMimeTypes,
} from "./wa_templates.utils";
import { getFlowWithSurveyTeamMapIds } from "../flows/flow.service";
import { getFileUrlFromKey } from "../../../utils/upload/s3Upload";
import prisma from "../../../utils/prisma";
import {
  SendTemplateToContacts,
  SendTemplateToContactGroups,
} from "../../external/v1/whatsapp/template/wa_templates.external.schema";
import { GraphApiError } from "../wa_axios";
import {
  getGraphApiErrorMessage,
  handleWhatsappError,
} from "../wa_error_handler";
import { updateMonthlyStat } from "../../stats/stats.service";
import { sendPaymentInitTemplate } from "../automatedReply/wa_automatedReply.utils";
import { wait } from "../whatsappSurvey/wasurvey.controller";
import { createWaMessageSchedule } from "../wa_message_scheduler";
import { parsePhoneforWa } from "../../loyalty/util";

export async function getTemplatesHandler(
  request: FastifyRequest<{
    Querystring: TemplateTypeParamsSchema;
  }>,
  reply: FastifyReply,
) {
  const { orgId } = request.user;
  const templates = await getTemplatesByOrgIdAndTemplateType(
    orgId,
    request.query.templateType,
  );
  reply.code(200).send(templates);
}

export async function getTemplateByIdHandler(
  request: FastifyRequest<{
    Params: ByTemplateIdParamsSchema;
  }>,
  reply: FastifyReply,
) {
  const { orgId } = await getOrgIdAndRole({ id: request.userId });
  const templates = await getTemplateByIdAndOrgId(
    request.params.templateId,
    orgId,
  );
  reply.code(200).send(templates);
}

export async function createTemplateHandler(
  request: FastifyRequest<{
    Body: CreateWaTemplateInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const orgId = request.user.orgId;
    // TODO: restrict access to super admin and admin?

    const { defaultValues, templateType, config, ...templateData } =
      request.body;
    const formattedTemplate = generateTemplate(templateData);
    let fetchedTemplate;
    switch (request.body.templateType) {
      case TemplateType.GENERAL_NOTIFICATION:
      case TemplateType.LOYALTY:
        const template = await createTemplate(orgId, formattedTemplate);
        //this is required to fetch the template from whatsapp to retreive the actual template data from whatsap
        fetchedTemplate = await fetchTemplate(template?.name, orgId);
        break;
      case TemplateType.ORDER_DETAILS:
        fetchedTemplate = {
          ...formattedTemplate,
          status: WaTemplateStatus.APPROVED,
          id: "localTemplate",
        };
        break;
      case TemplateType.PAYMENT_CONFIRMATION:
        fetchedTemplate = {
          ...formattedTemplate,
          components: formattedTemplate.components?.filter(
            (component) => component.type === WaTemplateComponentType.BODY,
          ),
          status: WaTemplateStatus.APPROVED,
          id: "localTemplate",
        };
        break;
      default:
        break;
    }
    if (templateData?.id) {
      await updateTemplateInDb(
        templateData.id,
        fetchedTemplate,
        null,
        templateType,
        config,
      );
    } else {
      await saveTemplate(
        fetchedTemplate,
        orgId,
        defaultValues as WaTemplateDefaultValues,
        templateType,
        config,
      );
    }

    reply.code(200).send("template created");
  } catch (e) {
    log.error("Error creating template \n%o", e?.response?.data);
    let errorMessage = "Error creating template";
    if (e instanceof GraphApiError) {
      errorMessage = getGraphApiErrorMessage(e);
    }
    reply.code(500).send(errorMessage ?? e);
  }
}

export async function saveTemplateAsDraftHandler(
  request: FastifyRequest<{
    Body: CreateWaTemplateInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = await getOrgIdAndRole({ id: request.userId });
    const { defaultValues, ...templateData } = request.body;
    let formattedTemplate: any = generateTemplate(templateData);
    formattedTemplate.status = WaTemplateStatus.DRAFT;
    if (request.body?.id) {
      const template = await getDbTemplate(request.body.id);
      template.data.name = request.body.name ?? template.data.name;
      template.data.components = formattedTemplate.components ?? [];
      template.data.status = WaTemplateStatus.DRAFT;
      template.data.language = formattedTemplate.language ?? "en";
      await updateTemplateInDb(request.body.id, template.data);
    } else {
      await saveTemplate(
        formattedTemplate,
        orgId,
        defaultValues as WaTemplateDefaultValues,
      );
    }
    reply.code(200);
  } catch (e) {
    log.error("Error saving template as Draft\n%o", e?.response?.data);
    if (e instanceof GraphApiError) {
      handleWhatsappError(e, request, reply);
    } else {
      reply.code(500).send(e);
    }
  }
}

export async function updateTemplateHandler(
  request: FastifyRequest<{
    Params: ByTemplateIdParamsSchema;
    Body: CreateWaTemplateInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = await getOrgIdAndRole({ id: request.userId });
    const template = await getDbTemplate(request.params.templateId);

    if (!template) {
      reply.status(404);
      log.trace("Template not found");
      return;
    } else if (template.orgId !== orgId) {
      log.trace(
        "User %s tried to update template %s from another org",
        request.userId,
        request.params.templateId,
      );
      reply.status(403);
      return;
    }
    const updatedTemplate = await updateTemplate(
      request.params.templateId,
      request.body,
    );
    if (updatedTemplate) {
      reply.status(200).send(updatedTemplate);
    } else {
      reply
        .status(400)
        .send("You can only edit an active template once in 24 hours.");
    }
  } catch (e) {
    log.error("Error updating template \n%o", e?.response?.data);
    if (e instanceof GraphApiError) {
      handleWhatsappError(e, request, reply);
    } else {
      reply.code(500).send(e);
    }
  }
}

export async function deleteTemplateHandler(
  request: FastifyRequest<{
    Params: ByTemplateIdParamsSchema;
  }>,
  reply: FastifyReply,
) {
  const { templateId } = request.params;
  try {
    const { data: template, orgId } = await getDbTemplate(templateId);
    const { orgId: userOrg } = await getOrgIdAndRole({ id: request.userId });
    if (userOrg !== orgId) {
      reply.code(403);
      return;
    }
    const { id, name } = template as WaTemplateFormatted;
    if (id) {
      await deleteTemplate(orgId, id, name);
    }
    await deleteTemplateFromDb(templateId);
    reply.code(204);
  } catch (e) {
    reply.code(500);
  }
}

export async function syncTemplatesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { orgId, role } = await getOrgIdAndRole({ id: request.userId });

  if (role !== Role.SUPER_ADMIN && role !== Role.ADMIN) {
    reply.code(403);
    return;
  }
  const synced = await syncTemplates(orgId);
  if (synced) {
    reply.code(200);
  } else {
    reply.code(500);
  }
}

export async function getUnregisteredTemplatesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = await getOrgIdAndRole({ id: request.userId });
    const unregisteredTemplates = await getUnregisteredTemplates(orgId);
    reply.code(200).send(unregisteredTemplates);
  } catch (e) {
    log.error("Error getting unregistered templates \n%o", e);
    reply.code(500);
  }
}

export async function registerTemplatesInDbHandler(
  request: FastifyRequest<{
    Body: RegisterTemplatesInDbBodySchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = await getOrgIdAndRole({ id: request.userId });
    await registerTemplatesInDb(request.body, orgId);
    reply.code(200);
  } catch (e) {
    log.error("Error registering templates \n%o", e);
    reply.code(500);
  }
}

export async function uploadHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const data = await request.file();
    if (!waAllowedMimeTypes.includes(data?.mimetype) || data.type !== "file")
      return reply
        .code(400)
        .send({ message: "This file type is not permitted." });
    const { orgId } = await getOrgIdAndRole({ id: request.userId });
    const size: any = data.fields.size;
    const { uploadSessionId, fileHandle } = await uploadFileToWaTemplate(
      data,
      size?.value,
      orgId,
    );
    if (fileHandle === "error")
      return reply.code(400).send("image upload failed");
    return reply.code(200).send({ id: fileHandle, uploadSessionId });
  } catch (e) {
    const error =
      typeof e?.message === "string" ? e?.message : e?.response?.data;
    log.error("Error uploading image to whatsapp templates \n%o", error);

    reply.code(500).send(error);
  }
}

export async function sendTemplateToUserCore(
  orgId: string,
  templateId: string,
  phoneNumber: string,
  parameterData: any[],
  teamId?: string,
  userId?: string,
  timeDelay?: number,
  isTemplateName = false,
  tag?: string,
  whatsappSettingsPhoneId?: string,
): Promise<{ status: boolean; message: string; id?: string }> {
  let dbTemplate = null;
  const phone = parsePhoneforWa(phoneNumber);
  if (isTemplateName) {
    dbTemplate = await getTemplateByNameAndOrgId(templateId, orgId);
    if (!dbTemplate) {
      log.error("Template not found with name %s", templateId);
      return { status: false, message: "Template not found with name" };
    }
  } else {
    dbTemplate = await getTemplateByIdAndOrgId(templateId, orgId);
  }

  const { data, defaultValues } = dbTemplate;
  const components = [...parameterData]; // Clone parameter data
  log.trace("parameterData => %o", parameterData);

  const containsFlowButton = !!getFlowIdFromTemplateComponents(data.components);
  let surveyTeamMapId = null;
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

    surveyTeamMapId = dbFlow?.survey?.teams.find(
      (t) => t.teamId === teamId,
    )?.id;
    if (!surveyTeamMapId) {
      throw new Error("Team not found in survey");
    }

    await deleteSession(orgId, phone);
    await createSession({
      phone,
      orgId,
      surveyTeamMapId,
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

  async function processComponents() {
    for await (const item of dbTemplate.data.components) {
      if (item.type?.toLowerCase() === WaTemplateComponentType.BUTTONS) {
        for await (const [idx, button] of item.buttons.entries()) {
          if (button?.type === "URL" && button?.example?.length > 0) {
            if (button?.example?.[0]?.startsWith(":")) {
              let shortUrlId = button?.example[0].slice(1);
              if (shortUrlId?.startsWith("error")) continue;

              const surveyTeamMapData = await prisma.surveyTeamMap.findFirst({
                where: { shortUrlId },
              });

              const surveyTeamMapWithTeam =
                await prisma.surveyTeamMap.findFirst({
                  where: {
                    surveyId: surveyTeamMapData.surveyId,
                    ...(teamId && { teamId }),
                  },
                });

              let url =
                surveyTeamMapWithTeam?.shortUrlId ||
                surveyTeamMapWithTeam?.id ||
                shortUrlId ||
                "error";
              let convertedTag = tag?.trim()?.replace(/\s+/g, "-") ?? "";
              log.info("Short URL ID: %s", url);
              log.info(
                "length : %s",
                `${url}?tag=${phone}${convertedTag ? `,${convertedTag}` : ""}`
                  .length,
              );
              components.push({
                type: "button",
                sub_type: "url",
                index: idx,
                parameters: [
                  {
                    type: "text",
                    text: `${url}?tag=${phone}${convertedTag ? `,${convertedTag}` : ""}`,
                  },
                ],
              });
            } else {
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
          } else if (button.type === "COPY_CODE") {
            components.push({
              type: "button",
              sub_type: button.type,
              index: 0,
              parameters: [
                {
                  type: "coupon_code",
                  coupon_code: button.example[0],
                },
              ],
            });
          }
        }
      }
    }
  }

  // Call the function and wait for it to complete before proceeding.
  await processComponents();

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
    if (params) {
      params.forEach((data, i) => {
        if (!data?.text || !data?.text?.trim()) {
          data.text = defaultValue?.[i];
        }
      });
      if (params.length < defaultValue?.length) {
        const remainingValues = defaultValue.slice(params.length);
        remainingValues.forEach((value) => {
          params.push({
            type: "text",
            text: value,
          });
        });
      }
    } else {
      templateQuery.components.push({
        type: "body",
        parameters: defaultValue.map((data: string) => ({
          type: "text",
          text: data,
        })),
      });
    }
  } else {
    templateQuery.components = components.filter((c) => c.type !== "body");
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
      surveyTeamMapId: surveyTeamMapId,
      timeDelay,
      source: waMessageScheduleSource.ExternalApi,
    });
    log.trace("Template schedule created successfully");
  } else {
    await wait(50);
    res = await sendMessage(
      orgId,
      templateMessage,
      null,
      userId,
      whatsappSettingsPhoneId,
    );
    await updateMonthlyStat(SubscriptionFeaturePathName.Whatsapp, orgId);
    log.trace("Template send to user successfully");
  }
  return res;
}

export async function sendTemplateToUserHandler(
  request: FastifyRequest<{
    Params: ByTemplateIdParamsSchema;
    Body: WaUserSendTemplateBodySchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { templateId } = request.params;
    const { phone, parameterData, teamId, whatsappSettingsPhoneId } =
      request.body;
    const orgId = request.user.orgId;
    const userId = request.userId;

    await sendTemplateToUserCore(
      orgId,
      templateId,
      phone,
      parameterData,
      teamId,
      userId,
      undefined,
      false,
      undefined,
      whatsappSettingsPhoneId,
    );

    reply.code(200).send("Template sent to user successfully");
  } catch (error) {
    log.error("Error sending template to user \n%o", error);
    if (error instanceof Error) {
      reply.code(400).send(error?.message);
    } else {
      reply
        .code(500)
        .send(error?.message ?? "Error sending template to contacts");
    }
  }
}

export async function sendTemplatesToContactsHandler(
  req: FastifyRequest<{
    Body: SendTemplateToContacts;
    Params: ByTemplateIdParamsSchema;
  }>,
  res: FastifyReply,
) {
  try {
    const { templateId } = req.params;
    const orgId = req.user.orgId;
    const userId = req.userId;
    const dbTemplate = await getTemplateByIdAndOrgId(templateId, orgId);
    const contacts = await prisma.contact.findMany({
      where: {
        id: {
          in: req.body.contactIds,
        },
      },
      select: {
        phone: true,
      },
    });

    for (const contact of contacts) {
      await sendTemplateToPhone({
        orgId,
        phone: contact.phone,
        dbTemplate,
        teamId: req.body.teamId,
        header: req.body.header,
        userId,
      });
    }
  } catch (error) {
    log.error("Error sending template to contacts \n%o", error);
    res.code(500).send(error);
  }
}

export async function sendTemplatesToContactGroupsHandler(
  req: FastifyRequest<{
    Body: SendTemplateToContactGroups;
    Params: ByTemplateIdParamsSchema;
  }>,
  res: FastifyReply,
) {
  try {
    const { templateId } = req.params;
    const orgId = req.user.orgId;
    const userId = req.userId;

    const dbTemplate = await getTemplateByIdAndOrgId(templateId, orgId);
    // TODO: can we optimize this query?
    const contacts = await prisma.contact.findMany({
      where: {
        contactGroups: {
          some: {
            contactGroupId: {
              in: req.body.contactGroupIds,
            },
          },
        },
      },
      select: {
        phone: true,
      },
    });

    for (const contact of contacts) {
      await sendTemplateToPhone({
        orgId,
        phone: contact.phone,
        dbTemplate,
        teamId: req.body.teamId,
        header: req.body.header,
        userId,
      });
    }
  } catch (error) {
    log.error("Error sending template to contactGroups \n%o", error);
    res.code(500).send(error);
  }
}
