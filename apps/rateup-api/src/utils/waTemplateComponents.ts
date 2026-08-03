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
