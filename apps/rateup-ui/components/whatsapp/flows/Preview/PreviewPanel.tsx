import {
  ActionIcon,
  Box,
  Flex,
  Group,
  Transition,
  useMantineTheme,
} from "@mantine/core";
import { useContext, useEffect, useState } from "react";
import { EditFlowContext } from "../FlowPage/EditFlow/EditFlowContext";
import {
  getFlowJsonWithTitleAndDescription,
  getScreenObjById,
} from "../../../../utils/whatsapp/flow.utils";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { WaFlowScreen } from "../../../../types/global";
import { FlowChatPreview } from "./FlowChatPreview";

interface PreviewProps {
  previewOpened: boolean;
}
export function PreviewPanel({ previewOpened }: PreviewProps) {
  const { survey, map, flowJson } = useContext(EditFlowContext);
  const theme = useMantineTheme();

  const [currentScreen, setCurrentScreen] = useState<WaFlowScreen>();

  useEffect(() => {
    if (flowJson.screens.length === 0) return;
    const json = getFlowJsonWithTitleAndDescription(flowJson, map, survey);
    if (currentScreen) {
      const screen = getScreenObjById(json.screens, currentScreen.id);
      if (screen) {
        setCurrentScreen(screen);
        return;
      }
    }
    setCurrentScreen(json.screens[0]);
  }, [flowJson.screens]);

  if (!currentScreen) return null;
  const json = getFlowJsonWithTitleAndDescription(flowJson, map, survey);
  function handlePrevScreen() {
    const currentScreenIndex = Math.max(
      json.screens.findIndex((s) => s.id === currentScreen.id),
      1,
    );
    setCurrentScreen(json.screens[currentScreenIndex - 1]);
  }
  function handleNextScreen() {
    const currentScreenIndex = Math.min(
      json.screens.findIndex((s) => s.id === currentScreen.id),
      json.screens.length - 2,
    );
    setCurrentScreen(json.screens[currentScreenIndex + 1]);
  }

  return (
    <Transition
      mounted={previewOpened}
      transition={"slide-left"}
      duration={100}
    >
      {(ts) => (
        <Box
          style={{
            minWidth: "fit-content",
            ...ts,
          }}
        >
          <Flex
            direction={"column"}
            style={{
              borderRadius: "8px",
              height: "100%",
            }}
          >
            <Group justify="space-between" mb="sm">
              <ActionIcon onClick={handlePrevScreen}>
                <IconChevronLeft />
              </ActionIcon>
              <Box
                mx="sm"
                py={4}
                style={{
                  borderRadius: "100px",
                  flex: 1,
                  textAlign: "center",
                  color: "white",
                  backgroundColor: theme.colors[theme.primaryColor][6],
                }}
              >
                {currentScreen?.title}
              </Box>
              <ActionIcon onClick={handleNextScreen}>
                <IconChevronRight />
              </ActionIcon>
            </Group>
            <Box
              style={{
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                minHeight: "500px",
                maxHeight: "600px",
                flex: 1,
                borderRadius: "16px",
                border: "2px solid",
                borderColor: theme.colors["whatsapp-green"][6],
                width: "300px",
                position: "relative",
              }}
            >
              <FlowChatPreview currentScreen={currentScreen} />
            </Box>
          </Flex>
        </Box>
      )}
    </Transition>
  );
}
