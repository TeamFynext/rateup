import { getTemplateByIdAndOrgId } from "../../../modules/whatsapp/messageTemplates/wa_templates.service.js";
import {
  WaTemplateComponentType,
  WaTemplateSupportedFormats,
  WaTemplateCategory,
  WaTemplateComponentTypeUpperCase,
} from "../../../types/enums.js";
import {
  WaSendMessageBody,
  WaTemplateFetchComponents,
  WaTemplateComponent,
  WHATSAPP_BUTTON_TYPE,
} from "../../../types/whatsapp.types.js";
import { parseStringWithVariables } from "../../../utils/template.js";
import { CreateWaTemplateFormattedInput, CreateWaTemplateInput } from "./wa_templates.schema.js";

export function generateTemplate(input: CreateWaTemplateInput): CreateWaTemplateFormattedInput {
  let components: CreateWaTemplateFormattedInput["components"] = [];
  if (parseStringWithVariables(input.body)?.length > 0) {
    components.push({
      type: WaTemplateComponentType.BODY,
      text: input.body,
      example: {
        body_text: input.example,
      },
    });
  } else {
    components.push({
      type: WaTemplateComponentType.BODY,
      text: input.body,
    });
  }

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
  if (input.footer)
    components.push({
      type: WaTemplateComponentType.FOOTER,
      text: input.footer,
    });

  return {
    name: input.name,
    components,
    language: input.language,
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
                  paramteters: [
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

/**
 * Returns flow_id if the templateComponents contains a flow button
 * @param components
 * @returns
 */
export function getFlowIdFromTemplateComponents(
  components: WaTemplateComponent[],
): string | undefined {
  const flowId = components
    .find((c) => c.type.toLocaleLowerCase() === WaTemplateComponentType.BUTTONS)
    ?.buttons?.find((b) => b.type === WHATSAPP_BUTTON_TYPE.FLOW)
    ?.flow_id?.toString();

  return flowId;
}

import { z } from "zod";

const MB = 1024 * 1024;

const allowedMimeTypes = {
  audio: {
    mimeTypes: [
      "audio/aac",
      "audio/amr",
      "audio/mpeg",
      "audio/mp4",
      "audio/ogg", // OPUS only (not enforced here)
    ],
    maxSize: 16 * MB,
  },
  document: {
    mimeTypes: [
      "text/plain",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/pdf",
    ],
    maxSize: 100 * MB,
  },
  image: {
    mimeTypes: ["image/jpeg", "image/png"],
    maxSize: 5 * MB,
  },
  sticker: {
    mimeTypes: ["image/webp"],
    maxSize: 500 * 1024, // Max for animated stickers; lower for static not distinguished here
  },
  video: {
    mimeTypes: ["video/3gpp", "video/mp4"],
    maxSize: 16 * MB,
  },
};

export const templateFileUploadSchema = z
  .object({
    type: z.enum(["audio", "document", "image", "sticker", "video"]),
    mimeType: z.string(),
    sizeInBytes: z.number().positive(),
  })
  .superRefine((file, ctx) => {
    const config = allowedMimeTypes[file.type];
    // Check if mimeType is allowed for any type
    const allAllowedMimeTypes = Object.values(allowedMimeTypes).flatMap((c) => c.mimeTypes);
    const isMimeTypeKnown = allAllowedMimeTypes.includes(file.mimeType);
    if (!isMimeTypeKnown) {
      ctx.addIssue({
        code: "custom",
        path: ["mimeType"],
        message: `Unknown MIME type '${file.mimeType}'`,
      });
      return;
    }
    // Check if mimeType is allowed for the given type
    if (!config.mimeTypes.includes(file.mimeType)) {
      ctx.addIssue({
        code: "custom",
        path: ["mimeType"],
        message: `MIME type '${file.mimeType}' is not valid for type '${file.type}'`,
      });
    }
    if (file.sizeInBytes > config.maxSize) {
      ctx.addIssue({
        code: "too_big",
        origin: "fileSize",
        maximum: config.maxSize,
        inclusive: true,
        type: "number",
        path: ["sizeInBytes"],
        message: `File size exceeds maximum for type '${file.type}' (${config.maxSize / MB} MB)`,
      });
    }
  });
