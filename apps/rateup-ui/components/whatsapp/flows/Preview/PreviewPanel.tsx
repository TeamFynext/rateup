import { Box, Flex, Group, Transition, useMantineTheme } from "@mantine/core";
import { useContext, useEffect, useState } from "react";
import { EditFlowContext } from "../FlowPage/EditFlow/EditFlowContext";
import { getFlowJsonWithTitleAndDescription } from "../../../../utils/whatsapp/flow.utils";
import { WaFlowScreen } from "../../../../types/global";
import { FlowChatPreview } from "./FlowChatPreview";

interface PreviewProps {
  previewOpened: boolean;
}
export function PreviewPanel({ previewOpened }: PreviewProps) {
  const { survey, map, flowJson, screenNumber } = useContext(EditFlowContext);
  const theme = useMantineTheme();
  const [currentScreen, setCurrentScreen] = useState<WaFlowScreen>();

  useEffect(() => {
    if (flowJson.screens.length === 0) return;
    const json = getFlowJsonWithTitleAndDescription(flowJson, map, survey);
    if (typeof screenNumber === "number")
      setCurrentScreen(json.screens?.[screenNumber ?? 0]);
  }, [flowJson, map, screenNumber, survey]);

  if (!currentScreen) return null;
  const json = getFlowJsonWithTitleAndDescription(flowJson, map, survey);

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
