import {
  WaTemplateCategory,
  WaTemplateComponentType,
  WaTemplateSupportedFormats,
} from "../../../types/enums";
import {
  CreateWaTemplateFormattedInput,
  CreateWaTemplateInput,
} from "./wa_templates.schema";

export function generateTemplate(
  input: CreateWaTemplateInput,
): CreateWaTemplateFormattedInput {
  // TODO: remove 'any' type
  let components: any = [
    {
      type: WaTemplateComponentType.BODY,
      text: input.body,
    },
  ];

  if (input.buttons?.length > 0) {
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
        format: input.format,
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
    language: "en",
    category:
      (input.category as WaTemplateCategory) ?? WaTemplateCategory.MARKETING,
  };
}

export const waAllowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "video/mp4",
  "application/pdf",
];
