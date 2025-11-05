"use client";

import { useEffect } from "react";

import { MantineProvider } from "@mantine/core";

import { whatsappTheme } from "@/config/mantineTheme";
import { useContactsStore } from "@/app/dashboard/inbox/store";
import WaInboxChatDisplay from "@/components/whatsapp/inbox/chatdisplay";

export const TicketChat = ({ contact }) => {
  const { setSelectedContact } = useContactsStore();
  useEffect(() => {
    if (contact) setSelectedContact(contact as any);
  }, [contact]);
  return (
    <MantineProvider theme={whatsappTheme}>
      <WaInboxChatDisplay smallScreen={true} />
    </MantineProvider>
  );
};
