import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Card, Group, Stack, Text, Tooltip } from "@mantine/core";

import { ContactsWithLastMessage } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { useSetIsChatDisplayOpen } from "@/pages/dashboard/whatsapp/inbox/ChatDisplayContext";
import useContactStore from "@/pages/dashboard/whatsapp/inbox/store";
import { formatToRelativeTime } from "@/utils/dateTime";
import {
  parseWaMessage,
  returnMessageContentBasedOnParsedMessage,
} from "@/utils/whatsapp/inbox";

import { WaInboxSessionAvatar } from "./sessionBadge";
import classes from "./styles.module.css";

export interface InboxContact extends ContactsData {
  userInitiatedFinalTimeStamp: string;
  id: string;
  name: string;
  lastMessage: any;
  waCreatedAt: string;
  phone: string;
}
interface WaInboxChatSelectCardProps {
  contact: InboxContact;
  tab: string;
}
export default function WaInboxChatSelectCard({
  contact,
  tab,
}: WaInboxChatSelectCardProps) {
  const params = useSearchParams();
  const lastMessage = contact?.lastMessage;

  const setIsChatDisplayOpen = useSetIsChatDisplayOpen();
  const { setSelectedContact } = useContactStore();

  return (
    <Card
      component={Link}
      href={`?tab=${tab}&contactId=${contact?.id}`}
      className={`${classes.wrapper} ${params.get("contactId") === contact?.id && classes.highlighted_wrapper}`}
      onClick={() => {
        setIsChatDisplayOpen(true);
        setSelectedContact(contact);
      }}
      py={"xs"}
    >
      <Group>
        <WaInboxSessionAvatar
          timeStamp={contact?.userInitiatedFinalTimeStamp}
          title={contact?.name}
        />
        <Stack className={classes.inner} flex={1}>
          <Group className={classes.chat_card_header}>
            <Text
              className={classes.chat_recepient_name}
              title={contact?.name}
              truncate
              tt={"capitalize"}
              fw={500}
            >
              {contact?.name ?? contact?.phone}
            </Text>
          </Group>
          <Group justify="space-between">
            <Tooltip
              position="bottom-start"
              label={
                parseWaMessage(lastMessage).messageContent ?? "No messages yet"
              }
            >
              <Text className={classes.latest_chat} truncate maw={200}>
                {returnMessageContentBasedOnParsedMessage(
                  parseWaMessage(lastMessage),
                )}
              </Text>
            </Tooltip>
            <Text className={classes.chat_time}>
              {formatToRelativeTime(contact?.waCreatedAt)}
            </Text>
          </Group>
        </Stack>
      </Group>
    </Card>
  );
}
