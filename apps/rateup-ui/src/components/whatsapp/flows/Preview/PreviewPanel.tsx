"use client";

import { useContext, useEffect, useState } from "react";

import { Box, Flex, Transition, useMantineTheme } from "@mantine/core";

import type { WaFlowScreen } from "@/types/global";

import { getFlowJsonWithTitleAndDescription } from "@/utils/whatsapp/flow.utils";
import useFlowStore from "../../flow-v2/utils/store.ts";
import { EditFlowContext } from "../FlowPage/EditFlow/EditFlowContext.ts";
import { FlowChatPreview } from "./FlowChatPreview.tsx";

interface PreviewProps {
  previewOpened: boolean;
  version?: number;
}
export function PreviewPanel({ previewOpened, version = 1 }: PreviewProps) {
  const { survey, map, flowJson, screenNumber } = useContext(EditFlowContext);
  const theme = useMantineTheme();
  const [currentScreen, setCurrentScreen] = useState<WaFlowScreen>();
  const { getCurrentScreen, currentScreenId, screens } = useFlowStore();
  useEffect(() => {
    if (version === 2) {
      setCurrentScreen(getCurrentScreen() as any);
    } else {
      if (!flowJson || !flowJson.screens || flowJson.screens?.length === 0)
        return;

      const json = getFlowJsonWithTitleAndDescription(flowJson, map, survey);
      if (typeof screenNumber === "number")
        setCurrentScreen(json.screens?.[screenNumber ?? 0]);
    }
  }, [flowJson, map, screenNumber, survey, currentScreenId, screens]);

  if (!currentScreen) return null;

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
                width: "300px",
                position: "relative",
              }}
              className="border border-primary"
            >
              <FlowChatPreview
                currentScreen={currentScreen}
                version={version}
              />
            </Box>
          </Flex>
        </Box>
      )}
    </Transition>
  );
}

