import { use } from "react";
import { useSearchParams } from "next/navigation";

import { Flex, Group, MantineProvider, Stack } from "@mantine/core";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import Analytics from "@/components/whatsapp/inbox/analytics/analaytics";
import WaInboxChatDisplayPopoverMsg from "@/components/whatsapp/inbox/chatdisplay/chatdisplayPoveroverMsg/page";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/whatsapp/inbox/resizeable";

import WaInboxChatDisplay from "../../../../components/whatsapp/inbox/chatdisplay";
import WaInboxChatSelect from "../../../../components/whatsapp/inbox/chatselect";
import { whatsappTheme } from "../../../../config/mantineTheme";
import ChatDisplayContext from "./ChatDisplayContext";
import styles from "./WhatsappInbox.module.css";

export default function WhatsAppInbox() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  return (
    <MantineProvider theme={whatsappTheme}>
      <ChatDisplayContext>
        <Stack className={styles["whatsapp-inbox-root-div"]}>
          {tab === "analytics" ? (
            <Analytics />
          ) : (
            <ResizablePanelGroup
              direction="horizontal"
              autoSaveId="inbox-panel-group"
              className="w-full h-full"
            >
              {/* defaultSize={350} maxSize={350} minSize={25} */}
              <ResizablePanel
                defaultSize={100}
                maxSize={350}
                minSize={18}
                className="p-1"
              >
                <WaInboxChatSelect />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={350} maxSize={350} minSize={30}>
                <WaInboxChatDisplay />
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </Stack>
      </ChatDisplayContext>
    </MantineProvider>
  );
}
