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
  // parsedTemplate.config = template?.config;

  for (const component of template?.data?.components ?? []) {
    if (component.type.toLowerCase() === "header") {
      parsedTemplate.format = component?.format ?? "NONE";
      if (
        component.format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.NONE ||
        component.format === WHATSAPP_TEMPLATE_BROADCAST_TYPE.LOCATION
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
    }
  }
  return parsedTemplate;
}
