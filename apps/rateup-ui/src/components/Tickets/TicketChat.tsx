"use client";

import { useEffect } from "react";

import WaInboxChatDisplay from "@/components/whatsapp/inbox/chatdisplay/index.tsx";
import { useContactsStore } from "@/components/dashboard/inbox/store.ts";

export const TicketChat = ({ contact }) => {
  const { setSelectedContact } = useContactsStore();
  useEffect(() => {
    if (contact) setSelectedContact(contact);
  }, [contact]);
  return <WaInboxChatDisplay smallScreen={true} />;
};
