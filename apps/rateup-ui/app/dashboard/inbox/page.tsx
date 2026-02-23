"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useMediaQuery } from "@mantine/hooks";

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
  );
}

const ResizeableChat = () => {
  const { data, isPending } = useWaSettings();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isChatDisplayOpen = useIsChatDisplayOpen();

  if (isPending) return <RateupLoader />;

  // Mobile: show either chat list or chat display (full width, no resize)
  if (isMobile) {
    return (
      <div className="h-full w-full">
        {isChatDisplayOpen ? (
          <WaInboxChatDisplay waSettings={data} smallScreen />
        ) : (
          <WaInboxChatSelect />
        )}
      </div>
    );
  }

  // Desktop: resizable two-panel layout
  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full">
      <ResizablePanel defaultSize={"28%"} minSize={"22%"} maxSize={"40%"}>
        <WaInboxChatSelect />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={"72%"} minSize={"60%"} maxSize={"78%"}>
        <WaInboxChatDisplay waSettings={data} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
