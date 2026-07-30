import { WaTemplateCategory } from "@/types/enums.ts";

import { WHATSAPP_BUTTON_TYPE, WHATSAPP_TEMPLATE_BROADCAST_TYPE } from "../constants.ts";

export function parseStringWithVariables(string: string): string[] {
  const regex = /{{(\d+)}}/g;
  let match;
  const dynamicVariables: string[] = [];
  while ((match = regex.exec(string)) !== null) {
    dynamicVariables.push(match[1]);
  }
  return dynamicVariables;
}

/**
 * The raw Meta template payload as stored on a template row. It is only ever
 * read structurally here, so these describe the fields this parser touches
 * rather than the full WhatsApp schema.
 */
interface RawTemplateButton {
  type?: string;
  text?: string;
  flow_id?: string | number;
  example?: string | string[];
  [key: string]: unknown;
}

interface RawTemplateComponent {
  type: string;
  format?: string;
  text?: string;
  code_expiration_minutes?: number;
  example?: { header_handle?: string[]; body_text?: string[][] };
  buttons?: RawTemplateButton[];
  cards?: { components?: RawTemplateComponent[] }[];
}

interface RawTemplate {
  templateType?: string;
  whatsappSettingsPhoneId?: string;
  defaultValues?: {
    whatsappSettingsPhoneId?: string;
    productCarousel?: { cardIndex: number; product_retailer_id?: string }[];
    [key: string]: unknown;
  };
  data?: {
    name?: string;
    category?: WaTemplateCategory;
    status?: string;
    language?: string;
    components?: RawTemplateComponent[];
  };
}

/** A single card of a media (non-product) carousel, as the UI consumes it. */
interface MediaCarouselCard {
  format: string;
  body: string;
  buttons: RawTemplateButton[];
  header: string | null;
  example: string[];
}

export function parseTemplate(template: RawTemplate) {
  const parsedTemplate: any = {};
  parsedTemplate.name = template?.data?.name;
  parsedTemplate.category = template?.data?.category;
  parsedTemplate.status = template?.data?.status;
  parsedTemplate.language = template?.data?.language;
  parsedTemplate.format = "NONE";
  parsedTemplate.header = null;
  parsedTemplate.buttons = [];
  parsedTemplate.footer = "";
  parsedTemplate.templateType = template?.templateType;
  parsedTemplate.defaultValues = template?.defaultValues;
  parsedTemplate.whatsappSettingsPhoneId =
    template?.whatsappSettingsPhoneId || template?.defaultValues?.whatsappSettingsPhoneId || "";
  parsedTemplate.mediaCarousel = [];
  parsedTemplate.productCarousel = [];
  // parsedTemplate.config = template?.config;

  for (const component of template?.data?.components ?? []) {
    if (component.type.toLowerCase() === "header") {
      parsedTemplate.format = component?.format ?? "NONE";
      if (
        component.format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.NONE ||
        component.format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.LOCATION ||
        component.format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.PRODUCT
      ) {
        parsedTemplate[component.type.toLowerCase()] = null;
      } else if (component.format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT) {
        parsedTemplate[component.type.toLowerCase()] = component?.text;
      } else {
        parsedTemplate[component.type.toLowerCase()] = component?.example?.header_handle?.[0];
      }
    } else if ("body" === component.type.toLowerCase()) {
      parsedTemplate[component.type.toLowerCase()] = component.text;
      parsedTemplate["example"] = component.example?.body_text?.[0] ?? [];
    } else if ("footer" === component.type.toLowerCase()) {
      parsedTemplate[component.type.toLowerCase()] = component.text;
      parsedTemplate.code_expiration_minutes = component?.code_expiration_minutes;
    } else if (component.type.toLowerCase() === "buttons") {
      if (template?.data?.category !== WaTemplateCategory.AUTHENTICATION) {
        component.buttons?.map((data: RawTemplateButton) => {
          if (data?.example && Array.isArray(data.example)) {
            data.example = data.example?.[0];
          }
        });
      }
      const parsedButtons = component.buttons?.map((button: RawTemplateButton) => {
        if (template?.data?.category === WaTemplateCategory.AUTHENTICATION) {
          return {
            type: WHATSAPP_BUTTON_TYPE.OTP,
            otp_type: "copy_code",
            text: button?.text,
          };
        } else {
          const parsedButton = { ...button };
          if (button.flow_id) {
            parsedButton.flow_id = String(button?.flow_id);
          }
          return parsedButton;
        }
      });
      parsedTemplate["buttons"] = parsedButtons;
    } else if (component.type.toLowerCase() === "carousel") {
      const headerComp = component.cards?.[0]?.components?.find(
        (c: RawTemplateComponent) => c.type.toLowerCase() === "header",
      );
      if (headerComp?.format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.PRODUCT) {
        const cards = component.cards?.map((card, index: number) => {
          const cardDefaultValue = template?.defaultValues?.productCarousel?.find(
            (p) => p.cardIndex === index,
          );
          const cardCarousel: {
            button: RawTemplateButton;
            product_retailer_id?: string;
          } = {
            button: {
              type: "",
              text: "",
              url: "",
            },
            product_retailer_id: cardDefaultValue?.product_retailer_id,
          };
          for (const cardComponent of card?.components ?? []) {
            if (cardComponent.type.toLowerCase() === "buttons") {
              cardComponent.buttons?.map((data: RawTemplateButton) => {
                if (data?.example && Array.isArray(data.example)) {
                  data.example = data.example?.[0];
                }
              });
              cardCarousel["button"] = cardComponent.buttons?.[0] ?? cardCarousel.button;
            }
          }
          return cardCarousel;
        });
        parsedTemplate["productCarousel"] = cards;
      } else {
        const cards = component.cards?.map((card) => {
          const cardCarousel: MediaCarouselCard = {
            format: "IMAGE",
            body: "",
            buttons: [],
            header: null,
            example: [],
          };
          for (const cardComponent of card?.components ?? []) {
            if (cardComponent.type.toLowerCase() === "header") {
              cardCarousel.format = cardComponent?.format ?? "IMAGE";
              cardCarousel.header = cardComponent?.example?.header_handle?.[0] ?? null;
            } else if ("body" === cardComponent.type.toLowerCase()) {
              cardCarousel.body = cardComponent.text ?? "";
              cardCarousel["example"] = cardComponent.example?.body_text?.[0] ?? [];
            } else if (cardComponent.type.toLowerCase() === "buttons") {
              cardComponent.buttons?.map((data: RawTemplateButton) => {
                if (data?.example && Array.isArray(data.example)) {
                  data.example = data.example?.[0];
                }
              });
              cardCarousel["buttons"] = cardComponent.buttons ?? [];
            }
          }
          return cardCarousel;
        });
        parsedTemplate["mediaCarousel"] = cards;
      }
    }
  }
  return parsedTemplate;
}
