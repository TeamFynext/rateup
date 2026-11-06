import { useContext } from "react";

import { WaFlowFormElementType } from "@/types/enums.ts";
import { getFlowFormElementById } from "@/utils/whatsapp/flow.utils";

import { EditFlowContext } from "./EditFlowContext.ts";
import { FlowEmbeddedLinkDetailedView } from "./FlowEmbeddedLinkView.tsx";
import { FlowImageDetailedView } from "./FlowImageDetailedView.tsx";
import { FlowTextDetailedView } from "./FlowTextDetailedView.tsx";

export function FlowNonQuestionDetailedView() {
  const { selectedFormElementId, flowJson } = useContext(EditFlowContext);

  const selectedFormElement = getFlowFormElementById(selectedFormElementId, flowJson);

  switch (selectedFormElement?.type) {
    case WaFlowFormElementType.image:
      return <FlowImageDetailedView />;
    case WaFlowFormElementType.embeddedLink:
      return <FlowEmbeddedLinkDetailedView />;
    default:
      return <FlowTextDetailedView />;
  }
}
