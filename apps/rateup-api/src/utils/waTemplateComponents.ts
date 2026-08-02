import { WaTemplateComponentType } from "../types/enums.js";
import { WaTemplateComponent, WHATSAPP_BUTTON_TYPE } from "../types/whatsapp.types.js";

/**
 * The flow_id of a template's flow button, if it has one.
 *
 * This lived twice, line for line: once in wa_templates.utils.ts and once in
 * campaign.service.ts, with neither importing the other. It sits here rather than
 * in either of them because it is a pure read over a template's components, and
 * because having campaign.service.ts import the templates module for it would pull
 * that module's whole dependency graph — and its Prisma client — behind it.
 * See issues.txt 17.8.
 */
export function getFlowIdFromTemplateComponents(
  components: WaTemplateComponent[],
): string | undefined {
  return components
    .find((c) => c.type.toLocaleLowerCase() === WaTemplateComponentType.BUTTONS)
    ?.buttons?.find((b) => b.type === WHATSAPP_BUTTON_TYPE.FLOW)
    ?.flow_id?.toString();
}
