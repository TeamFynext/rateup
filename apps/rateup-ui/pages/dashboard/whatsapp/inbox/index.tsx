import { Flex, Group, MantineProvider, Stack } from "@mantine/core";

import WaInboxChatDisplayPopoverMsg from "@/components/whatsapp/inbox/chatdisplay/chatdisplayPoveroverMsg/page";

import WaInboxChatDisplay from "../../../../components/whatsapp/inbox/chatdisplay";
import WaInboxChatSelect from "../../../../components/whatsapp/inbox/chatselect";
import { whatsappTheme } from "../../../../config/mantineTheme";
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
