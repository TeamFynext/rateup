import { useMediaQuery } from "@mantine/hooks";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";

import { useContactById } from "@/backend/campaign/contacts/contacts.query";
import { useContactsStore } from "@/components/dashboard/inbox/store.ts";
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

  const { selectedContact, setSelectedContact, contactsById } = useContactsStore();
  // Rows are keyed by ticket (conversation) id, so a `?contactId=` deep link has
  // to be resolved by scanning for that contact's row rather than a Map lookup.
  const rowForContactId = contactId
    ? (Array.from(contactsById.values()).find((c) => c?.id === contactId) ?? null)
    : null;
  const { data: fetchedContact } = useContactById(contactId && !rowForContactId ? contactId : "");

  useEffect(() => {
    if (contactId) {
      if (selectedContact?.id !== contactId) {
        const contactFromStore = rowForContactId;
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
      } else {
        // The chat is already selected, just consume the parameter to clear it from the URL
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
        // Lowercase: every consumer compares against lowercase tab values, so
        // "All" silently fell through to the legacy branch.
        search: { tab: "open" } as never,
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
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isChatDisplayOpen = useIsChatDisplayOpen();

  // Mobile: show either chat list or chat display (full width, no resize)
  if (isMobile) {
    return (
      <div className="h-full w-full">
        {isChatDisplayOpen ? <WaInboxChatDisplay /> : <WaInboxChatSelect />}
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
        <WaInboxChatDisplay />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
