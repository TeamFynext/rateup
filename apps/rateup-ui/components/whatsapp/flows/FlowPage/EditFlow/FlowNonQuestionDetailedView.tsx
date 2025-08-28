"use client";

import { useContext } from "react";

import { WaFlowFormElementType } from "../../../../../types/enums";
import { getFlowFormElementById } from "../../../../../utils/whatsapp/flow.utils";
import { EditFlowContext } from "./EditFlowContext";
import { FlowEmbeddedLinkDetailedView } from "./FlowEmbeddedLinkView";
import { FlowImageDetailedView } from "./FlowImageDetailedView";
import { FlowTextDetailedView } from "./FlowTextDetailedView";

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
    default:
      return <FlowTextDetailedView />;
  }
}
