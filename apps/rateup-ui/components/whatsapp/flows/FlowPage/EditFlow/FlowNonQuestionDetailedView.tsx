import { useContext } from "react";
import { EditFlowContext } from "./EditFlowContext";
import { getFlowFormElementById } from "../../../../../utils/whatsapp/flow.utils";
import { WaFlowFormElementType } from "../../../../../types/enums";
import { FlowImageDetailedView } from "./FlowImageDetailedView";
import { FlowTextDetailedView } from "./FlowTextDetailedView";
import { FlowEmbeddedLinkDetailedView } from "./FlowEmbeddedLinkView";
import { FlowOptedInDetailedView } from "./FlowOptInDetailedView";

export function FlowNonQuestionDetailedView() {
  const { selectedFormElementId, flowJson } = useContext(EditFlowContext);

  const selectedFormElement = getFlowFormElementById(
    selectedFormElementId,
    flowJson,
  );

  switch (selectedFormElement.type) {
    case WaFlowFormElementType.image:
      return <FlowImageDetailedView />;
    case WaFlowFormElementType.embeddedLink:
      return <FlowEmbeddedLinkDetailedView />;
    case WaFlowFormElementType.optIn:
      return <FlowOptedInDetailedView />;
    default:
      return <FlowTextDetailedView />;
  }
}
