import { FastifyReply, FastifyRequest } from "fastify";
import {
  WaTemplateCategory,
  WaTemplateComponentType,
  WaTemplateComponentTypeUpperCase,
  WaTemplateSupportedFormats,
} from "../../../types/enums.js";
import {
  WHATSAPP_BUTTON_TYPE,
  WaSendMessageBody,
  WaTemplateComponent,
  WaTemplateFetchComponents,
} from "../../../types/whatsapp.types.js";
import { parseStringWithVariables } from "../../../utils/template.js";
import { CreateWaTemplateFormattedInput, CreateWaTemplateInput } from "./wa_templates.schema.js";
import { getTemplateByIdAndOrgId } from "./wa_templates.service.js";
import { enforceWhatsappCountLimit } from "../../../utils/subscriptionLimit.js";
import prisma from "../../../utils/prisma.js";

export function generateTemplate(input: CreateWaTemplateInput): CreateWaTemplateFormattedInput {
  let components: CreateWaTemplateFormattedInput["components"] = [];
  if (parseStringWithVariables(input.body)?.length > 0) {
    if (input?.category === WaTemplateCategory.AUTHENTICATION) {
      components.push({
        type: WaTemplateComponentType.BODY,
        add_security_recommendation: true,
      });
    } else {
      components.push({
        type: WaTemplateComponentType.BODY,
        text: input.body,
        example: {
          body_text: input.example ? [input.example] : undefined,
        },
      });
    }
  } else if (input?.category === WaTemplateCategory.AUTHENTICATION) {
    components.push({
      type: WaTemplateComponentType.BODY,
      add_security_recommendation: true,
    });
  } else {
    components.push({
      type: WaTemplateComponentType.BODY,
      text: input.body,
    });
  }

  if (input.mediaCarousel?.length) {
    let cards = [];
    for (const card of input.mediaCarousel) {
      let cardComponents = [];
      if (card.header) {
        cardComponents.push({
          type: WaTemplateComponentType.HEADER,
          format: card.format,
          example: {
            header_handle: [card.header],
          },
        });
      }
      if (parseStringWithVariables(card.body)?.length > 0) {
        cardComponents.push({
          type: WaTemplateComponentType.BODY,
          text: card.body,
          example: {
            body_text: [card.example],
          },
        });
      } else {
        cardComponents.push({
          type: WaTemplateComponentType.BODY,
          text: card.body,
        });
      }

      if (card.buttons?.length) {
        cardComponents.push({
          type: WaTemplateComponentType.BUTTONS,
          buttons: card.buttons,
        });
      }
      cards.push({ components: cardComponents });
    }
    components.push({
      type: WaTemplateComponentType.CAROUSEL,
      cards,
    });
  } else if (input.productCarousel?.length) {
    let cards = [];
    for (const card of input.productCarousel) {
      let cardComponents = [];
      cardComponents.push({
        type: WaTemplateComponentType.HEADER,
        format: WaTemplateSupportedFormats.PRODUCT,
      });
      cardComponents.push({
        type: WaTemplateComponentType.BUTTONS,
        buttons: [card.button],
      });
      cards.push({ components: cardComponents });
    }
    components.push({
      type: WaTemplateComponentType.CAROUSEL,
      cards,
    });
  } else {
    if (input.buttons && input.buttons.length > 0) {
      components.push({
        type: WaTemplateComponentType.BUTTONS,
        buttons: input.buttons,
      });
    }
    if (input.header) {
      if (input.format === WaTemplateSupportedFormats.TEXT) {
        components.push({
          type: WaTemplateComponentType.HEADER,
          format: WaTemplateSupportedFormats.TEXT,
          text: input.header,
        });
      } else if (input.format === WaTemplateSupportedFormats.LOCATION) {
        components.push({
          type: WaTemplateComponentType.HEADER,
          format: WaTemplateSupportedFormats.LOCATION,
        });
      } else {
        components.push({
          type: WaTemplateComponentType.HEADER,
          format: input.format as WaTemplateSupportedFormats,
          example: {
            header_handle: [input.header],
          },
        });
      }
    }
    if (input.format === WaTemplateSupportedFormats.PRODUCT) {
      components.push({
        type: WaTemplateComponentType.HEADER,
        format: WaTemplateSupportedFormats.PRODUCT,
      });
    }
    if (input.footer) {
      if (input?.category === WaTemplateCategory.AUTHENTICATION) {
        if (input?.code_expiration_minutes) {
          components.push({
            type: WaTemplateComponentType.FOOTER,
            code_expiration_minutes: Number(input?.code_expiration_minutes),
          });
        } else {
          components.push({
            type: WaTemplateComponentType.FOOTER,
          });
        }
      } else {
        components.push({
          type: WaTemplateComponentType.FOOTER,
          text: input.footer,
        });
      }
    }
  }

  return {
    name: input.name,
    components,
    language: input.language,
    allow_category_change: true,
    category: (input.category as WaTemplateCategory) ?? WaTemplateCategory.MARKETING,
  };
}

export const waAllowedMimeTypes = ["image/jpeg", "image/png", "video/mp4", "application/pdf"];

/**
 * The pre-conversion message body: `template` still holds the shape Meta returns when a
 * template is READ BACK (uppercase component types, `language` as a bare code string).
 * This function rewrites it into the send shape.
 */
interface FetchedTemplateMessageBody extends Omit<WaSendMessageBody, "template"> {
  template?: {
    name: string;
    language: string;
    components?: WaTemplateFetchComponents[];
  };
}

export function getTemplateInMessageFormat(
  messageBody: FetchedTemplateMessageBody,
  parameterData: WaTemplateParameterData | null,
) {
  function getHeaderObject(header: WaTemplateFetchComponents) {
    const commonHeader = {
      type: "header",
      format: header.format?.toLowerCase(),
    };
    switch (header.format) {
      case "IMAGE":
      case "DOCUMENT":
      case "VIDEO":
        return {
          ...commonHeader,
          parameters: [
            {
              type: header.format.toLowerCase(),
              [header.format.toLowerCase()]: {
                link: parameterData?.header,
              },
            },
          ],
        };
      case "TEXT":
        return {
          ...commonHeader,
          [header.format.toLowerCase()]: header.text,
        };
      case "LOCATION":
        return {
          ...commonHeader,
          [header.format.toLowerCase()]: parameterData?.header,
        };
    }
  }

  function getBodyObject(body: WaTemplateFetchComponents) {
    return {
      type: "body",
      text: body.text,
    };
  }

  function getFooterObject(footer: WaTemplateFetchComponents) {
    return {
      type: "footer",
      text: footer.text,
    };
  }

  function getButtonObject(buttons: WaTemplateFetchComponents["buttons"]) {
    return (buttons ?? []).map((button, i) => ({
      type: "button",
      sub_type: "quick_reply",
      index: i.toString(),
      text: button.text,
    }));
  }
  return {
    ...messageBody,
    template: {
      ...messageBody.template,
      language: {
        code: messageBody?.template?.language,
      },
      components: (messageBody?.template?.components ?? [])
        .map((component) => {
          switch (component.type) {
            case WaTemplateComponentTypeUpperCase.HEADER:
              return getHeaderObject(component);
            case WaTemplateComponentTypeUpperCase.BODY:
              return getBodyObject(component);
            case WaTemplateComponentTypeUpperCase.FOOTER:
              return getFooterObject(component);
            case WaTemplateComponentTypeUpperCase.BUTTONS:
              return getButtonObject(component.buttons);
          }
        })
        .flat(),
    },
  };
}

export async function getTemplateQuery(
  templateId: string,
  orgId: string,
  paramerterData: WaTemplateParameterData | null,
) {
  const dbTemplate = await getTemplateByIdAndOrgId(templateId, orgId);
  const { data } = dbTemplate;
  const commonQuery = {
    name: data?.name,
    language: {
      code: data?.language,
    },
  };
  if (paramerterData) {
    return {
      ...commonQuery,
      components: data?.components.map((component) => {
        switch (component.type) {
          case WaTemplateComponentTypeUpperCase.HEADER:
            switch (component?.format) {
              case "IMAGE":
              case "VIDEO":
              case "DOCUMENT":
              case "LOCATION":
                if (!paramerterData?.header) {
                  throw new Error("Header parameter is missing");
                }
                return {
                  type: component?.type.toLowerCase(),
                  parameters: [
                    {
                      type: component?.format.toLowerCase(),
                      [component?.format.toLowerCase()]: {
                        link: paramerterData?.header,
                      },
                    },
                  ],
                };
            }
          default:
            return null;
        }
      }),
    };
  }
  return commonQuery;
}

export { getFlowIdFromTemplateComponents } from "../../../utils/waTemplateComponents.js";

export async function verifyTemplateSubscriptionLimit(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return await enforceWhatsappCountLimit(request, reply, {
    label: "templates",
    count: (orgId) => prisma.waTemplate.count({ where: { orgId } }),
  });
}
