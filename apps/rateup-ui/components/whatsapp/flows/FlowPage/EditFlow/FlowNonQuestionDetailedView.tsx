import { useContext } from "react";
import { EditFlowContext } from "./EditFlowContext";
import { getFlowFormElementById } from "../../../../../utils/whatsapp/flow.utils";
import { WaFlowFormElementType } from "../../../../../types/enums";
import { FlowImageDetailedView } from "./FlowImageDetailedView";
import { FlowTextDetailedView } from "./FlowTextDetailedView";

export function FlowNonQuestionDetailedView() {
  const { selectedFormElementId, flowJson } = useContext(EditFlowContext);

  const selectedFormElement = getFlowFormElementById(
    selectedFormElementId,
    flowJson,
  );

  if (selectedFormElement.type === WaFlowFormElementType.image) {
    return <FlowImageDetailedView />;
  } else {
    return <FlowTextDetailedView />;
  }
}
