import { WaTemplateComponentType } from "../types/enums.js";
import { WaTemplateComponent, WHATSAPP_BUTTON_TYPE } from "../types/whatsapp.types.js";

export function getFlowIdFromTemplateComponents(
  components: WaTemplateComponent[],
): string | undefined {
  return components
    .find((c) => c.type.toLocaleLowerCase() === WaTemplateComponentType.BUTTONS)
    ?.buttons?.find((b) => b.type === WHATSAPP_BUTTON_TYPE.FLOW)
    ?.flow_id?.toString();
}

/**
 * Every flow id referenced by a FLOW button in a template payload, carousel cards
 * included. Unlike getFlowIdFromTemplateComponents this does not stop at the first
 * one — a template can carry several buttons, and each has to resolve on the WABA
 * the template is created under.
 */
export function getFlowIdsFromTemplateComponents(components: WaTemplateComponent[]): string[] {
  const flowIds = new Set<string>();

  const collect = (componentList: WaTemplateComponent[]) => {
    for (const component of componentList) {
      if (component.type?.toLocaleLowerCase() === WaTemplateComponentType.BUTTONS) {
        for (const button of component.buttons ?? []) {
          if (button.type === WHATSAPP_BUTTON_TYPE.FLOW && button.flow_id) {
            flowIds.add(button.flow_id.toString());
          }
        }
      }
      for (const card of component.cards ?? []) {
        collect(card.components ?? []);
      }
    }
  };

  collect(components);
  return [...flowIds];
}
