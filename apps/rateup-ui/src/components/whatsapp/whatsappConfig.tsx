import { WaFlowFormElementType } from "@/types/enums.ts";

// Actual limit is 4096

export const WA_FLOW_HEADING_CHAR_LIMIT = 80;
export const WA_FLOW_BODY_CHAR_LIMIT = 4096;
export const WA_FLOW_CAPTION_CHAR_LIMIT = 4096;
export const WA_FLOW_SUBHEADING_CHAR_LIMIT = 60;
export const WA_FLOW_EMBEDDED_LINK_LIMIT = 25;

export const FlowMaxScreens = 8;
export const FlowMaxElementsPerScreen = 50;
export function getFlowLabelLimit(type: WaFlowFormElementType) {
  switch (type) {
    case WaFlowFormElementType.checkboxGroup:
    case WaFlowFormElementType.radioButtonsGroup:
      return 30;
    case WaFlowFormElementType.dropDown:
    case WaFlowFormElementType.textInput:
    case WaFlowFormElementType.textArea:
      return 20;
    case WaFlowFormElementType.datePicker:
      return 40;
    case WaFlowFormElementType.documentPicker:
    case WaFlowFormElementType.photoPicker:
      return 80;
    default:
      console.error("Invalid FlowElement type", type);
      return 20;
  }
}

export function getFlowOptionsLimit(type: WaFlowFormElementType) {
  switch (type) {
    case WaFlowFormElementType.checkboxGroup:
    case WaFlowFormElementType.radioButtonsGroup:
      return 20;
    case WaFlowFormElementType.dropDown:
      return 200;
    default:
      console.error("Invalid FlowElement type", type);
      return 20;
  }
}
