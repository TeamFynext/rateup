"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { MantineProvider, Stack } from "@mantine/core";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import Analytics from "@/components/whatsapp/inbox/analytics/analaytics";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/whatsapp/inbox/resizeable";

import WaInboxChatDisplay from "../../../components/whatsapp/inbox/chatdisplay";
import WaInboxChatSelect from "../../../components/whatsapp/inbox/chatselect";
import { whatsappTheme } from "../../../config/mantineTheme";
import ChatDisplayContext, { useIsChatDisplayOpen } from "./ChatDisplayContext";
import styles from "./WhatsappInbox.module.css";

export default function WhatsAppInbox() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const router = useRouter();

  useEffect(() => {
    if (!tab) {
      router.replace("/dashboard/inbox?tab=All");
    }
  }, [router, tab]);

  return (
    <MantineProvider theme={whatsappTheme}>
      <ChatDisplayContext>
        <div className={styles["whatsapp-inbox-root-div"]}>
          {tab === "analytics" ? <Analytics /> : <ResizeableChat />}
        </div>
      </ChatDisplayContext>
    </MantineProvider>
  );
}

const ResizeableChat = () => {
  const isChatDisplayOpen = useIsChatDisplayOpen();
  const { data, isPending } = useWaSettings();
  if (isPending) return <RateupLoader />;
  return (
    <ResizablePanelGroup
      direction="horizontal"
      autoSaveId="inbox-panel-group"
      className="w-full h-full gap-0"
    >
      <ResizablePanel
        defaultSize={20}
        maxSize={100}
        minSize={18}
        className={`min-w-[20vw] max-lg:min-w-[35vw] ${
          isChatDisplayOpen ? "max-sm:hidden" : ""
        }`}
        id="left"
        order={1}
      >
        <WaInboxChatSelect />
      </ResizablePanel>
      <ResizableHandle
        withHandle
        className={`max-sm:hidden focus:hidden bg-transparent`}
      />
      <ResizablePanel
        defaultSize={100}
        maxSize={100}
        minSize={40}
        className={`max-sm:${isChatDisplayOpen ? "" : "hidden"}`}
        id="right"
        order={2}
      >
        <WaInboxChatDisplay waSettings={data} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
