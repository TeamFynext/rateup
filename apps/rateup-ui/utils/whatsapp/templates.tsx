import { WHATSAPP_TEMPLATE_BROADCAST_TYPE } from "../constants";

export function parseTemplate(template) {
  let parsedTemplate: any = {};

  parsedTemplate.name = template.data.name;
  parsedTemplate.category = template.data.category;
  for (const component of template.data.components) {
    if (component.type.toLowerCase() === "header") {
      parsedTemplate.format = component?.format;
      if (
        component.format === WHATSAPP_TEMPLATE_BROADCAST_TYPE[0] ||
        component.format === WHATSAPP_TEMPLATE_BROADCAST_TYPE[5]
      ) {
        parsedTemplate[component.type.toLowerCase()] = null;
      } else if (component.format === WHATSAPP_TEMPLATE_BROADCAST_TYPE[1]) {
        parsedTemplate[component.type.toLowerCase()] = component?.text;
      } else {
        parsedTemplate[component.type.toLowerCase()] =
          component?.example?.header_handle?.[0];
      }
    } else if (["footer", "body"].includes(component.type.toLowerCase())) {
      parsedTemplate[component.type.toLowerCase()] = component.text;
    } else if (component.type.toLowerCase() == "buttons") {
      if (component.buttons.length > 2) {
        throw new Error("Template must have exactly 2 buttons");
      } else if (component.buttons.length === 0) {
        parsedTemplate["buttons"] == "NONE";
      } else {
        if (component.buttons[0].text == template.acceptButton) {
          parsedTemplate["declineButton"] = component.buttons[1].text;
          parsedTemplate["acceptButton"] = component.buttons[0].text;
        } else {
          parsedTemplate["declineButton"] = component.buttons[0].text;
          parsedTemplate["acceptButton"] = component.buttons[1].text;
        }
        parsedTemplate["buttons"] = "QUICK_REPLY";
      }
    }
  }
  return parsedTemplate;
}
