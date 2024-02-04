import {
  useMantineTheme,
  Title,
  Stack,
  Transition,
  Text,
  ScrollArea,
  Overlay,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import whatsappStyles from "../../whatsapp.module.css";
import { WaFlowJson, WaFlowScreen } from "../../../../types/global";
import {
  QuickReplyButton,
  ResponseMessageContainer,
  SendMessageMock,
} from "../../MessageComponents";
import {
  FlowPreviewContainer,
  FlowFormElementPreview,
} from "./FlowPreviewComponents";
import { getFlowFormElementsFromScreen } from "../../../../utils/whatsapp/flow.utils";

interface FlowChatPreviewProps {
  currentScreen: WaFlowScreen;
}
export const FlowChatPreview = ({ currentScreen }: FlowChatPreviewProps) => {
  const [opened, { open, close }] = useDisclosure(false);
  const theme = useMantineTheme();

  const elementsInScreen = getFlowFormElementsFromScreen(currentScreen);
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
      >
        Preview
      </Title>
      <Stack className={whatsappStyles.chatBg} px="xs" py="sm" justify="end">
        <Stack w="300px" gap={3}>
          <ResponseMessageContainer>
            <Text>Would you like to start the survey?</Text>
          </ResponseMessageContainer>
          <QuickReplyButton text={"Open"} onClick={open} />
        </Stack>
      </Stack>
      <SendMessageMock />
      <Transition mounted={opened} transition={"fade"}>
        {(ts) => (
          <Overlay
            style={{
              ...ts,
            }}
          />
        )}
      </Transition>
      <Transition mounted={opened} transition={"slide-up"}>
        {(transitionStyle) => (
          <Overlay
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "end",
            }}
          >
            <FlowPreviewContainer
              onClose={close}
              style={{
                ...transitionStyle,
              }}
            >
              {elementsInScreen.map((fe) => {
                return <FlowFormElementPreview fe={fe} />;
              })}
            </FlowPreviewContainer>
          </Overlay>
        )}
      </Transition>
    </>
  );
};
