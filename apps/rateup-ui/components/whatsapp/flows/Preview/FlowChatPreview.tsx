"use client";

import { Title, useMantineTheme } from "@mantine/core";

import { WaFlowFormElement, WaFlowScreen } from "../../../../types/global";
import {
  getFlowFooterElementsFromScreen,
  getFlowFormElementsFromScreen,
} from "../../../../utils/whatsapp/flow.utils";
import {
  FlowFormElementPreview,
  FlowPreviewContainer,
} from "./FlowPreviewComponents";

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
        style={{
          backgroundColor: theme.colors["whatsapp-green"][7],
          textAlign: "center",
        }}
        order={3}
        c={"white"}
        lineClamp={2}
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
