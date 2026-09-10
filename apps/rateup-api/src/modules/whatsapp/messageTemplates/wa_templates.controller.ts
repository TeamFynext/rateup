import { Role, TemplateType } from "../../../../generated/prisma/client.js";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  SubscriptionFeaturePathName,
  waMessageScheduleSource,
  WaTemplateComponentType,
  WaTemplateStatus,
} from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import { getOrgIdAndRole } from "../../user/user.service.js";
import { sendMessage } from "../whatsappSurvey/wasurvey.service.js";
import { createTemplateMessage } from "../whatsappSurvey/wasurvey.utils.js";
import {
  ByTemplateIdParamsSchema,
  CreateWaTemplateInput,
  CreateWaTemplateFormattedInput,
  RegisterTemplatesInDbBodySchema,
  TemplateTypeParamsSchema,
  WaUserSendTemplateBodySchema,
} from "./wa_templates.schema.js";
import {
  createTemplate,
  deleteTemplate,
  deleteTemplateFromDb,
  fetchTemplate,
  getDbTemplate,
  getTemplateByIdAndOrgId,
  getTemplateByNameAndOrgId,
  getTemplatesByOrgIdAndTemplateType,
  getUnregisteredTemplates,
  registerTemplatesInDb,
  saveTemplate,
  sendTemplateToPhone,
  TemplateFlowChannelError,
  syncTemplates,
  updateTemplate,
  updateTemplateInDb,
  uploadFileToWaTemplate,
  type templateData,
} from "./wa_templates.service.js";
import { generateTemplate, getFlowIdFromTemplateComponents } from "./wa_templates.utils.js";
import { getFlowWithSurveyTeamMapIds } from "../flows/flow.service.js";
import { signFlowToken } from "../flows/flowToken.js";
import { buildTemplateComponents } from "./templateComponents.js";
import prisma from "../../../utils/prisma.js";
import { GraphApiError } from "../wa_axios.js";
import { getGraphApiErrorMessage, handleWhatsappError } from "../wa_error_handler.js";
import { updateMonthlyStat } from "../../stats/stats.service.js";
import { sendPaymentInitTemplate } from "../automatedReply/wa_automatedReply.utils.js";
import { wait } from "../whatsappSurvey/wasurvey.controller.js";
import { createWaMessageSchedule } from "../wa_message_scheduler.js";
import { parsePhoneforWa } from "../../loyalty/util.js";
import {
  type OutgoingTemplateComponent,
  type WaTemplateComponent,
} from "../../../types/whatsapp.types.js";
import { validateFile } from "../../../utils/upload/validate.js";
import { SendTemplateToContacts } from "../../../external/v1/wa-templates/wa_templates.external.schema.js";

function getErrorResponseData(e: unknown): unknown {
  return e && typeof e === "object" && "response" in e
    ? (e as { response?: { data?: unknown } }).response?.data
    : undefined;
}

export async function getTemplatesHandler(
  request: FastifyRequest<{
    Querystring: TemplateTypeParamsSchema;
  }>,
  reply: FastifyReply,
) {
  const { orgId } = request.user;
  const templates = await getTemplatesByOrgIdAndTemplateType(orgId, request.query.templateType);
  reply.code(200).send(templates);
}

export async function getTemplateByIdHandler(
  request: FastifyRequest<{
    Params: ByTemplateIdParamsSchema;
  }>,
  reply: FastifyReply,
) {
  const orgAndRole = await getOrgIdAndRole({ id: request.userId });
  if (!orgAndRole) {
    reply.code(403).send({ message: "User is not a member of any org" });
    return;
  }
  const templates = await getTemplateByIdAndOrgId(request.params.templateId, orgAndRole.orgId);
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

    const { defaultValues, templateType, config, whatsappSettingsPhoneId, ...templateData } =
      request.body;
    const formattedTemplate = generateTemplate({
      ...templateData,
      whatsappSettingsPhoneId: whatsappSettingsPhoneId || "default_phone_id",
      config: config || {},
    });
    let fetchedTemplate;
    switch (request.body.templateType) {
      case TemplateType.GENERAL_NOTIFICATION:
      case TemplateType.LOYALTY:
      case TemplateType.CAROUSEL:
        const template = await createTemplate(orgId, formattedTemplate, whatsappSettingsPhoneId);
        //this is required to fetch the template from whatsapp to retreive the actual template data from whatsap
        fetchedTemplate = await fetchTemplate(template?.name, orgId, whatsappSettingsPhoneId);
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
        return reply.code(400).send({
          message: `templateType is required and must be one of ${Object.values(TemplateType).join(", ")}`,
        });
    }
    if (templateData?.id) {
      await updateTemplateInDb(
        templateData.id,
        orgId,
        fetchedTemplate,
        defaultValues as unknown as WaTemplateDefaultValues,
        templateType,
        config,
        whatsappSettingsPhoneId,
      );
    } else {
      await saveTemplate(
        fetchedTemplate,
        orgId,
        defaultValues as unknown as WaTemplateDefaultValues,
        templateType,
        config,
        whatsappSettingsPhoneId,
      );
    }

    reply.code(200).send("template created");
  } catch (e) {
    log.error({ err: e, data: getErrorResponseData(e) }, "Error creating template");
    if (e instanceof TemplateFlowChannelError) {
      // The caller picked a flow from another number — something they can fix, so 400.
      return reply.code(400).send({ message: e.message });
    }
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
    const orgAndRole = await getOrgIdAndRole({ id: request.userId });
    if (!orgAndRole) {
      reply.code(403).send({ message: "User is not a member of any org" });
      return;
    }
    const { orgId } = orgAndRole;
    const { defaultValues, templateType, whatsappSettingsPhoneId, ...templateData } = request.body;
    let formattedTemplate: CreateWaTemplateFormattedInput & { status?: WaTemplateStatus } =
      generateTemplate({
        ...templateData,
        whatsappSettingsPhoneId,
      });
    formattedTemplate.status = WaTemplateStatus.DRAFT;
    if (request.body?.id) {
      const template = await getDbTemplate(request.body.id, orgId);
      if (!template) {
        reply.code(404).send({ message: "Template not found" });
        return;
      }
      template.data.name = request.body.name ?? template.data.name;
      // generateTemplate emits the lowercase create-payload component names; the stored
      // row uses the uppercase read-back names. Same components, different casing.
      template.data.components = (formattedTemplate.components ??
        []) as unknown as WaTemplateComponent[];
      template.data.status = WaTemplateStatus.DRAFT;
      template.data.language = formattedTemplate.language ?? "en";
      await updateTemplateInDb(
        request.body.id,
        orgId,
        template.data,
        defaultValues as unknown as WaTemplateDefaultValues,
        templateType,
        undefined,
        whatsappSettingsPhoneId,
      );
    } else {
      await saveTemplate(
        formattedTemplate,
        orgId,
        defaultValues as unknown as WaTemplateDefaultValues,
        templateType,
        undefined,
        whatsappSettingsPhoneId,
      );
    }
    reply.code(200);
  } catch (e) {
    log.error({ err: e, data: getErrorResponseData(e) }, "Error saving template as Draft");
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
    const orgAndRole = await getOrgIdAndRole({ id: request.userId });
    if (!orgAndRole) {
      reply.code(403).send({ message: "User is not a member of any org" });
      return;
    }
    const template = await getDbTemplate(request.params.templateId, orgAndRole.orgId);

    if (!template) {
      reply.status(404);
      log.trace("Template not found");
      return;
    }
    const updatedTemplate = await updateTemplate(
      request.params.templateId,
      orgAndRole.orgId,
      request.body,
    );
    if (updatedTemplate) {
      reply.status(200).send(updatedTemplate);
    } else {
      reply.status(400).send("You can only edit an active template once in 24 hours.");
    }
  } catch (e) {
    log.error({ err: e, data: getErrorResponseData(e) }, "Error updating template");
    if (e instanceof TemplateFlowChannelError) {
      // The caller picked a flow from another number — something they can fix, so 400.
      reply.code(400).send({ message: e.message });
    } else if (e instanceof GraphApiError) {
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
    const orgAndRole = await getOrgIdAndRole({ id: request.userId });
    if (!orgAndRole) {
      reply.code(403);
      return;
    }
    const orgId = orgAndRole.orgId;
    const dbTemplate = await getDbTemplate(templateId, orgId);
    if (!dbTemplate) {
      reply.code(404);
      return;
    }
    const { data: template } = dbTemplate;
    const { id, name } = template;
    if (id) {
      const deletedAtMeta = await deleteTemplate(orgId, id, name);
      if (!deletedAtMeta) {
        reply.code(502).send({ message: "WhatsApp refused to delete this template" });
        return;
      }
    }
    await deleteTemplateFromDb(templateId, orgId);
    reply.code(204).send();
  } catch {
    reply.code(500);
  }
}

export async function syncTemplatesHandler(
  request: FastifyRequest<{
    Body: {
      whatsappSettingsPhoneIds: string[];
    };
  }>,
  reply: FastifyReply,
) {
  const orgAndRole = await getOrgIdAndRole({ id: request.userId });

  if (!orgAndRole || (orgAndRole.role !== Role.SUPER_ADMIN && orgAndRole.role !== Role.ADMIN)) {
    reply.code(403);
    return;
  }
  const result = await syncTemplates(orgAndRole.orgId, request.body.whatsappSettingsPhoneIds);
  if (result.success) {
    reply.code(200).send(result);
  } else {
    reply.code(500).send(result);
  }
}

export async function getUnregisteredTemplatesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const orgAndRole = await getOrgIdAndRole({ id: request.userId });
    if (!orgAndRole) {
      reply.code(403).send({ message: "User is not a member of any org" });
      return;
    }
    const unregisteredTemplates = await getUnregisteredTemplates(orgAndRole.orgId);
    reply.code(200).send(unregisteredTemplates);
  } catch (e) {
    log.error({ err: e }, "Error getting unregistered templates");
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
    const orgAndRole = await getOrgIdAndRole({ id: request.userId });
    if (!orgAndRole) {
      reply.code(403).send({ message: "User is not a member of any org" });
      return;
    }
    await registerTemplatesInDb(request.body, orgAndRole.orgId);
    reply.code(200);
  } catch (e) {
    log.error({ err: e }, "Error registering templates");
    reply.code(500);
  }
}

export async function uploadHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ message: "No file uploaded" });
    }
    const validation = validateFile({ data });
    if (!validation.valid) {
      data.file.resume();
      return reply.code(400).send({ message: validation.message });
    }
    const orgAndRole = await getOrgIdAndRole({ id: request.userId });
    if (!orgAndRole) {
      data.file.resume();
      return reply.code(403).send({ message: "User is not a member of any org" });
    }
    const buffer = await data.toBuffer();
    const size = buffer.length;
    const { uploadSessionId, fileHandle } = await uploadFileToWaTemplate(
      data,
      size,
      orgAndRole.orgId,
      buffer,
    );
    if (fileHandle === "error") return reply.code(400).send("image upload failed");
    return reply.code(200).send({ id: fileHandle, uploadSessionId });
  } catch (e) {
    const error = e instanceof Error ? e.message : getErrorResponseData(e);
    log.error({ err: e }, "Error uploading image to whatsapp templates");

    reply.code(500).send(error);
  }
}

export async function sendTemplateToUserCore(
  orgId: string,
  templateId: string,
  phoneNumber: string,
  parameterData: OutgoingTemplateComponent[],
  teamId?: string,
  userId?: string,
  timeDelay?: number,
  isTemplateName = false,
  tag?: string,
  buttonVariable?: string,
  quickReplyPayload?: string[],
  externalApi: boolean = false,
  /** Extra run context signed into a FLOW button's token, e.g. the loyalty feedback request. */
  flowContext?: { feedbackRequestId?: string | null },
): Promise<
  // The timeDelay branch returns the raw createWaMessageSchedule() row (its own
  // `status`/`id` fields, not this boolean/message shape) — callers that pass
  // timeDelay already special-case that (see wa_templates.external.controller.ts).
  | { status: boolean; message: string; id?: string }
  | Awaited<ReturnType<typeof createWaMessageSchedule>>
> {
  let dbTemplateResult: templateData | null;
  const phone = parsePhoneforWa(phoneNumber);
  if (isTemplateName) {
    dbTemplateResult = await getTemplateByNameAndOrgId(templateId, orgId);
    if (!dbTemplateResult) {
      log.error("Template not found with name %s", templateId);
      return { status: false, message: "Template not found with name" };
    }
  } else {
    dbTemplateResult = await getTemplateByIdAndOrgId(templateId, orgId);
    if (!dbTemplateResult) {
      log.error("Template not found with id %s", templateId);
      return { status: false, message: "Template not found with id" };
    }
  }
  // Captured as a `const` (rather than reused as the outer `let`) so the type stays
  // narrowed to non-null inside processComponents() below — a closure over a `let`
  // does not retain narrowing even after an early-return null check.
  const dbTemplate: templateData = dbTemplateResult;

  const { data, whatsappSettingsPhoneId } = dbTemplate;
  log.trace("parameterData => %o", parameterData);

  const containsFlowButton = !!getFlowIdFromTemplateComponents(data.components);
  let surveyTeamMapId: string | undefined = undefined;
  if (containsFlowButton) {
    const flowId = getFlowIdFromTemplateComponents(data.components);
    if (!flowId) {
      throw new Error("Flow id not found in template");
    }

    const dbFlow = await getFlowWithSurveyTeamMapIds(orgId, flowId);
    if (!dbFlow) {
      throw new Error("Flow not found in db");
    }

    surveyTeamMapId = dbFlow?.survey?.teams.find((t) => t.teamId === teamId)?.id;
    if (!surveyTeamMapId) {
      throw new Error("Team not found in survey");
    }
  }

  // One builder for every template send — the campaign worker calls the same
  // function, so a template produces identical components whichever path sends it.
  const components = await buildTemplateComponents({
    dbTemplate,
    orgId,
    phone,
    teamId,
    parameters: parameterData,
    tag,
    buttonVariable,
    quickReplyPayload,
    includeFlowButton: containsFlowButton,
    flowToken: surveyTeamMapId
      ? signFlowToken({
          surveyTeamMapId,
          orgId,
          phone,
          feedbackRequestId: flowContext?.feedbackRequestId,
        })
      : undefined,
  });

  const templateQuery = {
    name: data?.name,
    language: {
      code: dbTemplate.data?.language,
    },
    components: components,
  };
  // body_text is documented as a list of example sets; a flat list of strings is also
  // accepted, so normalise to one set of values.
  const storedExamples = dbTemplate?.data?.components?.find((data) => data.example?.body_text)
    ?.example?.body_text;
  const defaultValue: string[] = Array.isArray(storedExamples?.[0])
    ? storedExamples[0]
    : ((storedExamples as string[] | undefined) ?? []);

  if (defaultValue.length > 0) {
    let params = templateQuery?.components.find(
      (component) => component.type === "body",
    )?.parameters;
    if (params) {
      params.forEach((data: any, i: number) => {
        if (typeof data?.text !== "string" || !data.text.trim()) {
          data.text = defaultValue?.[i];
        }
      });
      if (params.length < defaultValue.length) {
        const remainingValues = defaultValue.slice(params.length);
        remainingValues.forEach((value: string) => {
          params.push({
            type: "text",
            text: value,
          });
        });
      }
    } else {
      templateQuery.components.push({
        type: "body",
        parameters: defaultValue.map((data) => ({
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
    templateMessage = await sendPaymentInitTemplate(orgId, phone, templateQuery, dbTemplate);
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
      teamId,
    });
    log.trace("Template schedule created successfully");
  } else {
    await wait(50);
    res = await sendMessage(
      orgId,
      templateMessage,
      undefined,
      userId,
      whatsappSettingsPhoneId ?? undefined,
      undefined,
      dbTemplate.data?.category,
      teamId,
      "TEMPLATE",
      false,
      externalApi,
      // Payment (order-details) prompts are transactional — exempt from the limit.
      dbTemplate.templateType === TemplateType.ORDER_DETAILS,
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
    const { phone, parameterData, teamId } = request.body;
    const orgId = request.user.orgId;
    const userId = request.userId;

    const result = await sendTemplateToUserCore(
      orgId,
      templateId,
      phone,
      parameterData,
      teamId,
      userId,
      undefined,
      false,
      undefined,
    );

    // `sendTemplateToUserCore` reports a failed send by returning `{ status: false }`
    // rather than throwing, so the catch below never sees it — check explicitly, or a
    // failed send would answer 200.
    if (result && "status" in result && result.status === false) {
      log.error({ result }, "Failed to send template to user");
      reply.code(400).send(result.message ?? "Failed to send template to user");
      return;
    }

    reply.code(200).send("Template sent to user successfully");
  } catch (error) {
    log.error({ err: error }, "Error sending template to user");
    if (error instanceof Error) {
      reply.code(400).send(error?.message);
    } else {
      reply.code(500).send("Error sending template to contacts");
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
    if (!dbTemplate) {
      return res.code(404).send({ message: "Template not found" });
    }
    const contacts = await prisma.contact.findMany({
      where: {
        id: {
          in: req.body.contactIds,
        },
        orgId,
      },
      select: {
        id: true,
        phone: true,
      },
    });

    let sent = 0;
    const failed: string[] = [];
    for (const contact of contacts) {
      if (!contact.phone) continue;
      try {
        await sendTemplateToPhone({
          orgId,
          phone: contact.phone,
          dbTemplate,
          teamId: req.body.teamId,
          header: req.body.header,
          userId,
        });
        sent++;
      } catch (error) {
        log.error({ err: error, contactId: contact.id }, "Error sending template to contact");
        failed.push(contact.id);
      }
    }

    const skipped = req.body.contactIds.length - contacts.length;
    return res.code(200).send({ sent, failed, skipped });
  } catch (error) {
    log.error({ err: error }, "Error sending template to contacts");
    res.code(500).send({ message: error instanceof Error ? error.message : "Unknown error" });
  }
}

const getLatestStatus = (statusObjInput: unknown) => {
  // WaMessage.stats is a free-form Json? column (see prisma schema default value) —
  // no generated type describes its shape, so it's read via a documented cast.
  const statusObj = statusObjInput as {
    read?: unknown;
    delivered?: unknown;
    failed?: unknown;
    sent?: unknown;
  } | null;
  if (statusObj?.failed) return "failed";
  if (statusObj?.read) return "read";
  if (statusObj?.delivered) return "delivered";
  if (statusObj?.sent) return "sent";
  return "pending";
};
export async function getMessageStatusByIdHandler(
  request: FastifyRequest<{
    Params: { messageId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { messageId } = request.params;
    const { orgId } = request.user;
    const messageStatus = await prisma.waMessage.findFirst({
      where: { messageId, orgId },
      select: {
        messageId: true,
        stats: true,
        errorMessage: true,
      },
    });
    if (!messageStatus) return reply.code(404).send({ message: "Message not found" });
    let status = getLatestStatus(messageStatus.stats);
    let response = {
      messageId: messageStatus.messageId,
      status,
      ...(status === "failed" ? { errorMessage: messageStatus.errorMessage } : {}),
    };

    reply.code(200).send(response);
  } catch (error) {
    log.error({ err: error }, "Error getting message status by id");
    reply.code(500).send(error);
  }
}
