"use client";

import { useEffect } from "react";

import { useContactsStore } from "@/app/dashboard/inbox/store";
import WaInboxChatDisplay from "@/components/whatsapp/inbox/chatdisplay";

export const TicketChat = ({ contact }) => {
  const { setSelectedContact } = useContactsStore();
  useEffect(() => {
    if (contact) setSelectedContact(contact);
  }, [contact]);
  return <WaInboxChatDisplay smallScreen={true} />;
};
