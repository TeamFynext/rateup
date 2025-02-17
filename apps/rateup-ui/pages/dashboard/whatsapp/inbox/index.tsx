import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Group, MantineProvider, Stack, Title } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";

import {
  ContactsWithLastMessage,
  WaGetMessagesBody,
  WaMessagePage,
} from "../../../../backend/whatsapp/inbox/message/wamessage.api";
import {
  useContactsWithLastMessage,
  useGetMessagesByContactId,
  useMessageCount,
} from "../../../../backend/whatsapp/inbox/message/wamessage.query";
import WaInboxChatDisplay from "../../../../components/whatsapp/inbox/chatdisplay";
import WaInboxChatSelect from "../../../../components/whatsapp/inbox/chatselect";
import WhatsAppInboxLoader from "../../../../components/whatsapp/inbox/loader";
import { whatsappTheme } from "../../../../config/mantineTheme";
import { useWsData } from "../../../../context/UserContext";
import ChatDisplayContext from "./ChatDisplayContext";
import styles from "./WhatsappInbox.module.css";

export default function WhatsAppInbox() {
  return (
    <MantineProvider theme={whatsappTheme}>
      <ChatDisplayContext>
        <Stack className={styles["whatsapp-inbox-root-div"]}>
          <Group className={styles["chat-selector-and-chat-container"]}>
            <WaInboxChatSelect />
            <WaInboxChatDisplay />
          </Group>
        </Stack>
      </ChatDisplayContext>
    </MantineProvider>
  );
}
