"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { MantineProvider, Stack } from "@mantine/core";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import Analytics from "@/components/whatsapp/inbox/analytics/analaytics";
import InboxSettings from "@/components/whatsapp/inbox/InboxSettings";

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
          {tab === "analytics" ? (
            <Analytics />
          ) : tab === "settings" ? (
            <InboxSettings />
          ) : (
            <ResizeableChat />
          )}
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
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={26} minSize={26} maxSize={60}>
        <div>
          <WaInboxChatSelect />
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={74} minSize={40} maxSize={74}>
        <div className="h-full">
          <WaInboxChatDisplay waSettings={data} />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
