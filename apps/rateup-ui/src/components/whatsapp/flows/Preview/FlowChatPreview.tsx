"use client";

import { Title, useMantineTheme } from "@mantine/core";

import type { WaFlowFormElement, WaFlowScreen } from "@/types/global";

import {
  getFlowFooterElementsFromScreen,
  getFlowFormElementsFromScreen,
} from "@/utils/whatsapp/flow.utils";
import {
  FlowFormElementPreview,
  FlowPreviewContainer,
} from "./FlowPreviewComponents.tsx";

interface FlowChatPreviewProps {
  currentScreen: WaFlowScreen;
  version: number;
}
export const FlowChatPreview = ({
  currentScreen,
  version,
}: FlowChatPreviewProps) => {
  const theme = useMantineTheme();

  const elementsInScreen =
    (getFlowFormElementsFromScreen(
      currentScreen,
      false,
      version,
    ) as WaFlowFormElement[]) ?? [];
  const footerElement = getFlowFooterElementsFromScreen(
    currentScreen,
    version,
  )?.[0] as { label: string };
  return (
    <>
      <Title
        p="sm"
        order={3}
        c={"white"}
        lineClamp={2}
        className="bg-primary text-center"
      >
        {currentScreen?.title ?? "Screeen Name"}
      </Title>
      <FlowPreviewContainer footerLabel={footerElement?.label}>
        {elementsInScreen?.map((fe) => (
          <FlowFormElementPreview fe={fe} key={fe?.id} />
        ))}
      </FlowPreviewContainer>
    </>
  );
};

