export function parseTemplate(template) {
  let parsedTemplate: any = {}

  parsedTemplate.name = template.data.name;
  
  for (const component of template.data.components) {
    if (["header", "footer", "body"].includes(component.type.toLowerCase())) {
      parsedTemplate[component.type.toLowerCase()] = component.text
    } else if (component.type.toLowerCase() == "buttons") {
      if (component.buttons.length !== 2) {
        throw new Error("Template must have exactly 2 buttons")
      } else {
        if (component.buttons[0].text == template.acceptButton) {
          parsedTemplate["declineButton"] = component.buttons[1].text;
          parsedTemplate["acceptButton"] = component.buttons[0].text;
        } else {
          parsedTemplate["declineButton"] = component.buttons[0].text;
          parsedTemplate["acceptButton"] = component.buttons[1].text;
        }
      }
    }
  }
  return parsedTemplate;
}