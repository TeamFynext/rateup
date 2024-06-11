import { useMantineTheme, Title } from "@mantine/core";
import { WaFlowScreen } from "../../../../types/global";
import {
  FlowPreviewContainer,
  FlowFormElementPreview,
} from "./FlowPreviewComponents";
import {
  getFlowFooterElementsFromScreen,
  getFlowFormElementsFromScreen,
} from "../../../../utils/whatsapp/flow.utils";

interface FlowChatPreviewProps {
  currentScreen: WaFlowScreen;
}
export const FlowChatPreview = ({ currentScreen }: FlowChatPreviewProps) => {
  const theme = useMantineTheme();

  const elementsInScreen = getFlowFormElementsFromScreen(currentScreen) ?? [];
  const footerElement = getFlowFooterElementsFromScreen(currentScreen)?.[0];
  console.log(elementsInScreen);

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
