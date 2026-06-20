import { useEffect } from "react";

import { useMediaQuery } from "@mantine/hooks";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";

import { useContactById } from "@/backend/campaign/contacts/contacts.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { useContactsStore } from "@/components/dashboard/inbox/store.ts";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable.tsx";
import Analytics from "@/components/whatsapp/inbox/analytics/analaytics.tsx";
import WaInboxChatDisplay from "@/components/whatsapp/inbox/chatdisplay/index.tsx";
import WaInboxChatSelect from "@/components/whatsapp/inbox/chatselect/index.tsx";
import InboxSettings from "@/components/whatsapp/inbox/InboxSettings/index.tsx";

import ChatDisplayContext, {
  useIsChatDisplayOpen,
} from "../../../components/dashboard/inbox/ChatDisplayContext.tsx";
import styles from "../../../components/dashboard/inbox/WhatsappInbox.module.css";

export const Route = createFileRoute("/dashboard/inbox/")({
  component: WhatsAppInbox,
});

function WhatsAppInbox() {
  const searchParams: { tab?: string; contactId?: string } = useSearch({
    from: Route.id,
  });
  const tab = searchParams.tab;
  const contactId = searchParams.contactId;
  const navigate = useNavigate();

  const { selectedContact, setSelectedContact, contactsById } =
    useContactsStore();
  const { data: fetchedContact } = useContactById(
    contactId && !contactsById.has(contactId) ? contactId : "",
  );

  useEffect(() => {
    if (contactId && selectedContact?.id !== contactId) {
      const contactFromStore = contactsById.get(contactId);
      let consumed = false;
      if (contactFromStore) {
        setSelectedContact(contactFromStore);
        consumed = true;
      } else if (fetchedContact) {
        setSelectedContact(fetchedContact);
        consumed = true;
      }
      if (consumed) {
        navigate({
          to: "/dashboard/inbox",
          search: { tab } as never,
          replace: true,
        });
      }
    }
  }, [
    contactId,
    fetchedContact,
    contactsById,
    selectedContact?.id,
    setSelectedContact,
    navigate,
    tab,
  ]);

  useEffect(() => {
    if (!tab) {
      navigate({
        to: "/dashboard/inbox",
        replace: true,
        search: { tab: "All" } as never,
      });
    }
  }, [tab]);

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

function ResizeableChat() {
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
}
