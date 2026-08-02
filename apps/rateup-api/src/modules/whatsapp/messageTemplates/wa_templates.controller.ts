import { Role, TemplateType } from "../../../../generated/prisma/client.js";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  SubscriptionFeaturePathName,
  waMessageScheduleSource,
  WaTemplateComponentType,
  WaTemplateStatus,
  WaTemplateSupportedFormats,
} from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import { getOrgIdAndRole } from "../../user/user.service.js";
import { createSession, deleteSession, sendMessage } from "../whatsappSurvey/wasurvey.service.js";
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
  syncTemplates,
  updateTemplate,
  updateTemplateInDb,
  uploadFileToWaTemplate,
  type templateData,
} from "./wa_templates.service.js";
import { generateTemplate, getFlowIdFromTemplateComponents } from "./wa_templates.utils.js";
import { getFlowWithSurveyTeamMapIds } from "../flows/flow.service.js";
import { getFileUrlFromKey } from "../../../utils/upload/s3Upload.js";
import prisma from "../../../utils/prisma.js";
import { GraphApiError } from "../wa_axios.js";
import { getGraphApiErrorMessage, handleWhatsappError } from "../wa_error_handler.js";
import { updateMonthlyStat } from "../../stats/stats.service.js";
import {
  generateOrderReferenceId,
  sendPaymentInitTemplate,
} from "../automatedReply/wa_automatedReply.utils.js";
import { wait } from "../whatsappSurvey/wasurvey.controller.js";
import { createWaMessageSchedule } from "../wa_message_scheduler.js";
import { parsePhoneforWa } from "../../loyalty/util.js";
import {
  WHATSAPP_BUTTON_TYPE,
  type OutgoingTemplateComponent,
  type WaTemplateComponent,
} from "../../../types/whatsapp.types.js";
import { isEmptyString } from "../../../utils/commonUtils.js";
import { getConnectedWaCatalog } from "../catalog/catalog.service.js";
import dayjs from "dayjs";
import { validateFile } from "../../../utils/upload/validate.js";
import {
  ErrorLogsQuery,
  SendTemplateToContacts,
} from "../../../external/v1/wa-templates/wa_templates.external.schema.js";

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
        // An unrecognised (or absent) templateType used to fall through here with
        // `fetchedTemplate` still undefined, so saveTemplate was called with no
        // template at all — and saveTemplate swallowed the resulting database
        // failure, so the handler still answered 200 "template created" having
        // stored nothing. See issues.txt 14.4.
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
      // Scoped to the caller's org. This handler never compared orgId itself,
      // unlike its update and delete siblings, so naming another org's template id
      // in the body rewrote their template into a draft — replacing its components
      // and status. See issues.txt 14.3.
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
    // The separate orgId comparison that used to sit here is redundant now that
    // getDbTemplate is org-scoped — a foreign template already answered 404 above.
    // See issues.txt 14.3.
    const updatedTemplate = await updateTemplate(
      request.params.templateId,
      orgAndRole.orgId,
      request.body,
    );
    if (updatedTemplate) {
      reply.status(200).send(updatedTemplate);
    } else {
      // Only reached when Meta genuinely refused the edit. Every other falsy
      // result — a swallowed database failure, a template that vanished — used to
      // land here too and be reported as the 24-hour cooldown, which was the one
      // explanation that had nothing to do with what actually went wrong.
      // updateTemplateInDb now throws instead of swallowing (14.2), so those
      // reach the catch below. See issues.txt 14.10.
      reply.status(400).send("You can only edit an active template once in 24 hours.");
    }
  } catch (e) {
    log.error({ err: e, data: getErrorResponseData(e) }, "Error updating template");
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
    const orgAndRole = await getOrgIdAndRole({ id: request.userId });
    if (!orgAndRole) {
      reply.code(403);
      return;
    }
    const orgId = orgAndRole.orgId;
    // The lookup is org-scoped now, so the separate orgId comparison that used to
    // follow it is redundant. See issues.txt 14.3.
    const dbTemplate = await getDbTemplate(templateId, orgId);
    if (!dbTemplate) {
      reply.code(404);
      return;
    }
    const { data: template } = dbTemplate;
    const { id, name } = template;
    if (id) {
      // deleteTemplate reports false when Meta refused. Our copy used to be
      // removed anyway, leaving the template alive at Meta with nothing pointing
      // at it — and counting against the org's template quota. See issues.txt 14.10.
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
    // The size is measured from the bytes actually received. It used to be taken
    // from a client-supplied `size` form field, defaulting to 0 when absent — so
    // Meta was told a length the client chose, which need not match the upload.
    // See issues.txt 14.10.
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

  const { data, defaultValues, whatsappSettingsPhoneId } = dbTemplate;
  const components = [...parameterData]; // Clone parameter data
  log.trace("parameterData => %o", parameterData);

  const containsFlowButton = !!getFlowIdFromTemplateComponents(data.components);
  let surveyTeamMapId: string | undefined = undefined;
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

    surveyTeamMapId = dbFlow?.survey?.teams.find((t) => t.teamId === teamId)?.id;
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
  const addHeaderComponent = (
    format: WaTemplateSupportedFormats,
    link: string,
    filename: string | null = null,
  ) => {
    const newComponent = {
      type: WaTemplateComponentType.HEADER,
      parameters: [
        {
          type: format.toLowerCase(),
          [format.toLowerCase()]: {
            link,
            ...(filename ? { filename } : {}),
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
          throw new Error("Image not found in template. Please upload an image and try again");
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
          throw new Error("File not found in template. Please upload a document and try again");
        }
        break;
      case WaTemplateSupportedFormats.VIDEO:
        if (defaultValues?.video?.link) {
          addHeaderComponent(
            WaTemplateSupportedFormats.VIDEO,
            getFileUrlFromKey(defaultValues.video.link),
          );
        } else {
          throw new Error("Video not found in template. Please upload a video and try again");
        }
        break;
      case WaTemplateSupportedFormats.PRODUCT:
        const catalog = await getConnectedWaCatalog(whatsappSettingsPhoneId!, orgId);
        if (!catalog || catalog.catalogId !== defaultValues?.catalog?.catalogId) {
          log.error(
            "The selected catalog not linked to the selected account: catalogId => %s, phoneId => %s",
            defaultValues?.catalog?.catalogId,
            whatsappSettingsPhoneId,
          );
          throw Error("The selected catalog not linked to the selected whatsapp account");
        }
        components.push({
          type: WaTemplateComponentType.HEADER,
          parameters: [
            {
              type: WaTemplateSupportedFormats.PRODUCT.toLocaleUpperCase(),
              [WaTemplateSupportedFormats.PRODUCT.toLocaleLowerCase()]: {
                product_retailer_id: defaultValues?.catalog?.spm?.product_retailer_id,
                catalog_id: catalog.catalogId,
              },
            },
          ],
        });
        break;
      default:
        // Handle unsupported formats if needed
        break;
    }
  }

  async function processComponents() {
    for await (const item of dbTemplate.data.components) {
      if (item.type?.toLowerCase() === WaTemplateComponentType.BUTTONS) {
        let quickReplyIdx = 0;
        for await (const [idx, button] of item.buttons?.entries() ?? []) {
          if (button?.type === "URL" && (button.example?.length ?? 0) > 0) {
            if (button?.example?.[0]?.startsWith(":")) {
              let shortUrlId = button?.example[0].slice(1);
              if (shortUrlId?.startsWith("error")) continue;

              const surveyTeamMapData = await prisma.surveyTeamMap.findFirst({
                where: { shortUrlId },
              });
              if (!surveyTeamMapData) continue;

              const surveyTeamMapWithTeam = await prisma.surveyTeamMap.findFirst({
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
                `${url}?tag=${phone}${convertedTag ? `,${convertedTag}` : ""}`.length,
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
            } else if (button?.url?.includes("COPY_CODE")) {
              components.push({
                type: "button",
                sub_type: button.type,
                index: 0,
                parameters: [
                  {
                    type: "text",
                    text: components?.[0]?.parameters?.[0]?.text || "123",
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
                    text: buttonVariable || button?.example?.[0] || phone,
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
                  coupon_code: button.example?.[0],
                },
              ],
            });
          } else if (button.type === WHATSAPP_BUTTON_TYPE.CATALOG) {
            components.push({
              type: "button",
              sub_type: button.type,
              index: 0,
              ...(defaultValues?.catalog?.thumbnail_product_retailer_id?.length
                ? {
                    parameters: [
                      {
                        type: "action",
                        action: {
                          thumbnail_product_retailer_id:
                            defaultValues?.catalog?.thumbnail_product_retailer_id,
                        },
                      },
                    ],
                  }
                : {}),
            });
          } else if (button.type === WHATSAPP_BUTTON_TYPE.MPM) {
            components.push({
              type: "button",
              sub_type: button.type,
              index: 0,
              parameters: [
                {
                  type: "action",
                  action: {
                    thumbnail_product_retailer_id:
                      isEmptyString(defaultValues?.catalog?.thumbnail_product_retailer_id) ??
                      undefined,
                    sections: defaultValues?.catalog?.mpm?.sections?.map(({ title, products }) => ({
                      title,
                      product_items: products.map((p) => ({
                        product_retailer_id: p,
                      })),
                    })),
                  },
                },
              ],
            });
          } else if (
            button.type === WHATSAPP_BUTTON_TYPE.ORDER_DETAILS &&
            dbTemplate.templateType !== TemplateType.ORDER_DETAILS &&
            !components.some((c) => c.type === "button" && c.sub_type === "order_details")
          ) {
            const sub_total =
              Number(defaultValues?.orderDetails?.item?.price) *
              Number(defaultValues?.orderDetails?.item?.quantity);
            const total_amount =
              sub_total +
              Number(defaultValues?.orderDetails?.shipping ?? 0) +
              Number(defaultValues?.orderDetails?.tax ?? 0) -
              Number(defaultValues?.orderDetails?.discount ?? 0);
            components.push({
              type: "button",
              sub_type: button.type.toLowerCase(),
              index: 0,
              parameters: [
                {
                  type: "action",
                  action: {
                    order_details: {
                      reference_id: generateOrderReferenceId(),
                      currency: "INR",
                      type: defaultValues?.orderDetails?.productType,
                      payment_settings: [
                        {
                          type: "payment_gateway",
                          payment_gateway: {
                            type: defaultValues?.orderDetails?.paymentType,
                            configuration_name: defaultValues?.orderDetails?.paymentConfigName,
                          },
                        },
                      ],
                      ...(defaultValues?.orderDetails?.productType === "physical-goods"
                        ? {
                            shipping_info: {
                              country: "IN",
                              addresses: [],
                            },
                          }
                        : {}),
                      order: {
                        items: [
                          {
                            amount: {
                              offset: 100,
                              value: Number(defaultValues?.orderDetails?.item?.price) * 100,
                            },
                            ...(defaultValues?.orderDetails?.item?.salePrice
                              ? {
                                  sale_amount: {
                                    offset: 100,
                                    value:
                                      Number(defaultValues?.orderDetails?.item?.salePrice) * 100,
                                  },
                                }
                              : {}),
                            name: defaultValues?.orderDetails?.item?.name,
                            quantity: defaultValues?.orderDetails?.item?.quantity,
                            country_of_origin: defaultValues?.orderDetails?.item?.origin,
                            importer_name: defaultValues?.orderDetails?.item?.importerName,
                            importer_address: {
                              address_line1: defaultValues?.orderDetails?.item?.importerAddress1,
                              city: defaultValues?.orderDetails?.item?.importerCity,
                              zone_code: defaultValues?.orderDetails?.item?.importerZoneCode,
                              postal_code: defaultValues?.orderDetails?.item?.importerPostalCode,
                              country_code: "IN",
                            },
                          },
                        ],
                        sub_total: {
                          offset: 100,
                          value: sub_total * 100,
                        },
                        shipping: {
                          offset: 100,
                          value: Number(defaultValues?.orderDetails?.shipping) * 100,
                        },
                        tax: {
                          offset: 100,
                          // `description`, not `discription` — the merchant's
                          // explanation of the tax never reached the customer's
                          // payment prompt. See issues.txt 14.9.
                          description: defaultValues?.orderDetails?.taxDescription,
                          value: Number(defaultValues?.orderDetails?.tax) * 100,
                        },
                        ...(defaultValues?.orderDetails?.discount
                          ? {
                              discount: {
                                offset: 100,
                                description: defaultValues?.orderDetails?.discountDescription,
                                value: Number(defaultValues?.orderDetails?.discount) * 100,
                              },
                            }
                          : {}),
                        status: "pending",
                        ...(defaultValues?.orderDetails?.expiry
                          ? {
                              expiration: {
                                timestamp: dayjs(defaultValues?.orderDetails?.expiry)
                                  .add(300, "seconds")
                                  .unix(),
                              },
                            }
                          : {}),
                      },
                      total_amount: {
                        offset: 100,
                        // × 100 like every sibling amount above. `offset: 100`
                        // tells WhatsApp the value is in minor units, so an
                        // unmultiplied total rendered a hundred times too small:
                        // a true total of 250 was shown to the customer as ₹2.50,
                        // contradicting the line items right beside it.
                        // See issues.txt 14.1(c).
                        value: total_amount * 100,
                      },
                    },
                  },
                },
              ],
            });
          } else if (button.type === WHATSAPP_BUTTON_TYPE.QUICK_REPLY) {
            if (
              (quickReplyPayload?.length ?? 0) > quickReplyIdx &&
              quickReplyPayload?.[quickReplyIdx]
            ) {
              components.push({
                type: "button",
                sub_type: button.type,
                index: idx,
                parameters: [
                  {
                    type: "payload",
                    payload: quickReplyPayload[quickReplyIdx],
                  },
                ],
              });
              quickReplyIdx++;
            }
          }
        }
      }
      if (item.type?.toLowerCase() === WaTemplateComponentType.CAROUSEL) {
        const headerFormat = item?.cards?.[0]?.components.find(
          (c) => c?.type.toLowerCase() === WaTemplateComponentType.HEADER,
        )?.format;
        if (headerFormat === WaTemplateSupportedFormats.PRODUCT) {
          const catalog = await getConnectedWaCatalog(whatsappSettingsPhoneId!, orgId);
          if (!catalog || catalog.catalogId !== defaultValues?.catalog?.catalogId) {
            log.error(
              "The selected catalog not linked to the selected account: catalogId => %s, phoneId => %s",
              defaultValues?.catalog?.catalogId,
              whatsappSettingsPhoneId,
            );
            throw Error("The selected catalog not linked to the selected whatsapp account");
          }
          let cards = await Promise.all(
            item?.cards?.map(async (card, index) => {
              const cardInComponents = components.find(
                (c) => c.type === WaTemplateComponentType.CAROUSEL,
              )?.cards?.[index];
              const cardDefaultValues = defaultValues?.productCarousel?.find(
                (c) => c.cardIndex === index,
              );
              let cardComponents = cardInComponents ? [...cardInComponents.components] : [];
              for (const comp of card.components) {
                if (comp.type.toLowerCase() === WaTemplateComponentType.HEADER) {
                  if (!comp.format) continue;
                  if (!cardComponents?.some((c) => c.type === WaTemplateComponentType.HEADER)) {
                    const productId = cardDefaultValues?.product_retailer_id;
                    cardComponents.push({
                      type: WaTemplateComponentType.HEADER,
                      parameters: [
                        {
                          type: comp.format.toLowerCase(),
                          [comp.format.toLowerCase()]: {
                            product_retailer_id: productId,
                            catalog_id: catalog.catalogId,
                          },
                        },
                      ],
                    });
                  }
                } else if (comp.type.toLowerCase() === WaTemplateComponentType.BUTTONS) {
                  for (const [idx, button] of comp.buttons?.entries() ?? []) {
                    if (button?.type === "URL") {
                      if (button?.example?.[0]?.startsWith(":")) {
                        let shortUrlId = button?.example[0].slice(1);
                        if (shortUrlId?.startsWith("error")) continue;

                        const surveyTeamMapData = await prisma.surveyTeamMap.findFirst({
                          where: { shortUrlId },
                        });
                        if (!surveyTeamMapData) continue;

                        const surveyTeamMapWithTeam = await prisma.surveyTeamMap.findFirst({
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
                          `${url}?tag=${phone}${convertedTag ? `,${convertedTag}` : ""}`.length,
                        );
                        cardComponents.push({
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
                        continue;
                      }
                      cardComponents.push({
                        type: "button",
                        sub_type: "url",
                        index: idx,
                        ...(button?.example?.[0]
                          ? {
                              parameters: [
                                {
                                  type: "text",
                                  text: button?.example[0],
                                },
                              ],
                            }
                          : {}),
                      });
                    }
                  }
                }
              }
              return {
                card_index: index,
                components: cardComponents,
              };
            }) ?? [],
          );
          components.push({
            type: "carousel",
            cards,
          });
        } else {
          let cards = await Promise.all(
            item?.cards?.map(async (card, index) => {
              const cardInComponents = components.find(
                (c) => c.type === WaTemplateComponentType.CAROUSEL,
              )?.cards?.[index];
              const cardDefaultValues = defaultValues?.mediaCarousel?.find(
                (c) => c.cardIndex === index,
              );
              let cardComponents = cardInComponents ? [...cardInComponents.components] : [];
              for (const comp of card.components) {
                if (comp.type.toLowerCase() === WaTemplateComponentType.HEADER) {
                  if (!comp.format) continue;
                  if (
                    !cardComponents?.some((c) => c.type === WaTemplateComponentType.HEADER) &&
                    cardDefaultValues?.headerLink
                  ) {
                    const fileKey = cardDefaultValues.headerLink;
                    cardComponents.push({
                      type: WaTemplateComponentType.HEADER,
                      parameters: [
                        {
                          type: comp.format.toLowerCase(),
                          [comp.format.toLowerCase()]: {
                            link: getFileUrlFromKey(fileKey),
                          },
                        },
                      ],
                    });
                  }
                } else if (comp.type.toLowerCase() === WaTemplateComponentType.BODY) {
                  // body_text is documented as a list of example sets; a flat list of
                  // strings is also accepted, so normalise to one set of values.
                  const storedExamples = comp.example?.body_text;
                  const defaultValue: string[] = Array.isArray(storedExamples?.[0])
                    ? storedExamples[0]
                    : ((storedExamples as string[] | undefined) ?? []);
                  if (defaultValue.length > 0) {
                    const cardBodyIndex = cardComponents.findIndex(
                      (component) => component.type === "body",
                    );
                    if (cardBodyIndex !== -1) {
                      let params = cardComponents[cardBodyIndex]?.parameters;
                      if (params) {
                        params.forEach((data, i) => {
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
                        cardComponents[cardBodyIndex] = {
                          type: "body",
                          parameters: params,
                        };
                      }
                    } else {
                      cardComponents.push({
                        type: "body",
                        parameters: defaultValue.map((data) => ({
                          type: "text",
                          text: data,
                        })),
                      });
                    }
                  } else {
                    cardComponents = cardComponents.filter((f) => f.type !== "body");
                  }
                } else if (comp.type.toLowerCase() === WaTemplateComponentType.BUTTONS) {
                  for (const [idx, button] of comp.buttons?.entries() ?? []) {
                    if (button?.type === "URL") {
                      if (button?.example?.[0]?.startsWith(":")) {
                        let shortUrlId = button?.example[0].slice(1);
                        if (shortUrlId?.startsWith("error")) continue;

                        const surveyTeamMapData = await prisma.surveyTeamMap.findFirst({
                          where: { shortUrlId },
                        });
                        if (!surveyTeamMapData) continue;

                        const surveyTeamMapWithTeam = await prisma.surveyTeamMap.findFirst({
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
                          `${url}?tag=${phone}${convertedTag ? `,${convertedTag}` : ""}`.length,
                        );
                        cardComponents.push({
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
                        continue;
                      }
                      cardComponents.push({
                        type: "button",
                        sub_type: "url",
                        index: idx,
                        ...(button?.example?.[0]
                          ? {
                              parameters: [
                                {
                                  type: "text",
                                  text: button?.example[0],
                                },
                              ],
                            }
                          : {}),
                      });
                    } else if (button?.type === "QUICK_REPLY") {
                      cardComponents.push({
                        type: "button",
                        sub_type: "quick_reply",
                        index: idx,
                        ...(cardDefaultValues?.quickReplyPayload
                          ? {
                              parameters: [
                                {
                                  type: "payload",
                                  payload: cardDefaultValues?.quickReplyPayload,
                                },
                              ],
                            }
                          : {}),
                      });
                    }
                  }
                }
              }
              return {
                card_index: index,
                components: cardComponents,
              };
            }) ?? [],
          );
          components.push({
            type: "carousel",
            cards,
          });
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
      params.forEach((data, i) => {
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
        // orgId, like the template lookup one line above. Without it, a caller who
        // named another org's contact ids got that org's customers messaged — from
        // the caller's own WhatsApp number and template, with the caller billed and
        // the receiving org's customers hearing from a business they never
        // contacted. This handler is mounted on the API-key-authenticated external
        // API. See issues.txt 14.1(b).
        orgId,
      },
      select: {
        id: true,
        phone: true,
      },
    });

    // Per-contact outcomes, so the caller learns how many were actually reached.
    // The handler used to set no status and send no body at all, so fastify fell
    // back to an empty 200 that said nothing. See issues.txt 14.10.
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
  // `failed` is tested FIRST. WhatsApp can mark a message delivered and then fail
  // it (a block, a deleted account); read/delivered were tested first, so such a
  // message reported "delivered" and its failure reason was dropped — which is
  // exactly the case a caller polls this endpoint to find out about.
  // See issues.txt 14.10.
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
      // orgId: this filtered on messageId alone, so any caller holding a WhatsApp
      // message id learned that message's delivery state and, if it failed, the
      // reason — whichever org sent it. See issues.txt 14.3.
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

export async function getErrorLogsHandler(
  request: FastifyRequest<{
    Querystring: ErrorLogsQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const data = await prisma.waLogs.findMany({
      where: {
        orgId: request.user.orgId,
        createdAt: {
          ...(request.query.endDate ? { lte: new Date(request.query.endDate) } : {}),
          ...(request.query.startDate ? { gte: new Date(request.query.startDate) } : {}),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      omit: {
        orgId: true,
      },
    });
    return reply.code(200).send(data);
  } catch (error) {
    log.error({ err: error }, "Error getting error logs");
    reply.code(500).send({ message: "Error getting error logs" });
  }
}
