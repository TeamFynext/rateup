import { useSearchParams } from "next/navigation";

import { MantineProvider, Stack } from "@mantine/core";

import Analytics from "@/components/whatsapp/inbox/analytics/analaytics";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/whatsapp/inbox/resizeable";

import WaInboxChatDisplay from "../../../../components/whatsapp/inbox/chatdisplay";
import WaInboxChatSelect from "../../../../components/whatsapp/inbox/chatselect";
import { whatsappTheme } from "../../../../config/mantineTheme";
import ChatDisplayContext, { useIsChatDisplayOpen } from "./ChatDisplayContext";
import styles from "./WhatsappInbox.module.css";

export default function WhatsAppInbox() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  return (
    <MantineProvider theme={whatsappTheme}>
      <ChatDisplayContext>
        <Stack className={styles["whatsapp-inbox-root-div"]}>
          {tab === "analytics" ? <Analytics /> : <ResizeableChat />}
        </Stack>
      </ChatDisplayContext>
    </MantineProvider>
  );
}

const ResizeableChat = () => {
  const isChatDisplayOpen = useIsChatDisplayOpen();
  return (
    <ResizablePanelGroup
      direction="horizontal"
      autoSaveId="inbox-panel-group"
      className="w-full h-full max-md:pt-5"
    >
      <ResizablePanel
        defaultSize={100}
        maxSize={350}
        minSize={18}
        className={`p-1 max-sm:${isChatDisplayOpen ? "hidden" : ""}`}
        id="left"
        order={1}
      >
        <WaInboxChatSelect />
      </ResizablePanel>
      <ResizableHandle withHandle className={`max-sm:hidden`} />
      <ResizablePanel
        defaultSize={350}
        maxSize={350}
        minSize={39}
        className={`p-1 max-sm:${isChatDisplayOpen ? "" : "hidden"}`}
        id="right"
        order={2}
      >
        <WaInboxChatDisplay />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
