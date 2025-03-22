import { useEffect } from "react";

import { MantineProvider } from "@mantine/core";

import { whatsappTheme } from "@/config/mantineTheme";
import WaInboxChatDisplay from "@/components/whatsapp/inbox/chatdisplay";

import useContactStore from "../../pages/dashboard/whatsapp/inbox/store";

export const TicketChat = ({ contact }) => {
  const { setSelectedContact } = useContactStore();
  useEffect(() => {
    if (contact) setSelectedContact(contact as any);
  }, [contact]);
  return (
    <MantineProvider theme={whatsappTheme}>
      <WaInboxChatDisplay smallScreen={true} />
    </MantineProvider>
  );
};
