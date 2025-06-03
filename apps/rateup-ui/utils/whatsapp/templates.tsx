import { WHATSAPP_TEMPLATE_BROADCAST_TYPE } from "../constants";

export function parseTemplate(template) {
  let parsedTemplate: any = {};
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
        parsedTemplate[component.type.toLowerCase()] =
          component?.example?.header_handle?.[0];
      }
    } else if ("body" === component.type.toLowerCase()) {
      parsedTemplate[component.type.toLowerCase()] = component.text;
      parsedTemplate["example"] = component.example?.body_text?.[0] ?? [];
    } else if ("footer" === component.type.toLowerCase()) {
      parsedTemplate[component.type.toLowerCase()] = component.text;
    } else if (component.type.toLowerCase() == "buttons") {
      component.buttons.map((data) => {
        if (data?.example && Array.isArray(data.example)) {
          data.example = data.example?.[0];
        }
      });
      const parsedButtons = component.buttons.map((button) => {
        const parsedButton = { ...button };
        if (button.flow_id) {
          parsedButton.flow_id = String(button?.flow_id);
        }
        return parsedButton;
      });
      parsedTemplate["buttons"] = parsedButtons;
    } else if (component.type.toLowerCase() === "carousel") {
      const headerComp = component.cards[0].components.find(
        (c) => c.type.toLowerCase() === "header",
      );
      if (headerComp?.format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.PRODUCT) {
        const cards = component.cards.map((card, index) => {
          const cardDefaultValue =
            template?.defaultValues?.productCarousel?.find(
              (p) => p.cardIndex === index,
            );
          let cardCarousel = {
            button: {
              type: "",
              text: "",
              url: "",
            },
            product_retailer_id: cardDefaultValue.product_retailer_id,
          };
          for (const cardComponent of card?.components ?? []) {
            if (cardComponent.type.toLowerCase() == "buttons") {
              cardComponent.buttons.map((data) => {
                if (data?.example && Array.isArray(data.example)) {
                  data.example = data.example?.[0];
                }
              });
              cardCarousel["button"] = cardComponent.buttons[0];
            }
          }
          return cardCarousel;
        });
        parsedTemplate["productCarousel"] = cards;
      } else {
        const cards = component.cards.map((card) => {
          let cardCarousel = {
            format: "IMAGE",
            body: "",
            buttons: [],
            header: null,
            example: [],
          };
          for (const cardComponent of card?.components ?? []) {
            if (cardComponent.type.toLowerCase() === "header") {
              cardCarousel.format = cardComponent?.format ?? "IMAGE";
              cardCarousel[cardComponent.type.toLowerCase()] =
                cardComponent?.example?.header_handle?.[0];
            } else if ("body" === cardComponent.type.toLowerCase()) {
              cardCarousel[cardComponent.type.toLowerCase()] =
                cardComponent.text;
              cardCarousel["example"] =
                cardComponent.example?.body_text?.[0] ?? [];
            } else if (cardComponent.type.toLowerCase() == "buttons") {
              cardComponent.buttons.map((data) => {
                if (data?.example && Array.isArray(data.example)) {
                  data.example = data.example?.[0];
                }
              });
              cardCarousel["buttons"] = cardComponent.buttons;
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
