import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Card, Group, Stack, Text, Tooltip } from "@mantine/core";

import { ContactsWithLastMessage } from "../../../../../backend/whatsapp/inbox/message/wamessage.api";
import { useSetIsChatDisplayOpen } from "../../../../../pages/dashboard/whatsapp/inbox/ChatDisplayContext";
import { formatToCustomTime } from "../../../../../utils/dateTime";
import {
  parseWaMessage,
  returnMessageContentBasedOnParsedMessage,
} from "../../../../../utils/whatsapp/inbox";
import WaInboxSessionBadge from "./sessionBadge";
import classes from "./styles.module.css";

interface WaInboxChatSelectCardProps {
  contact: ContactsWithLastMessage;
}
export default function WaInboxChatSelectCard({
  contact,
}: WaInboxChatSelectCardProps) {
  const params = useSearchParams();
  const lastMessage = contact?.lastMessage;

  const setIsChatDisplayOpen = useSetIsChatDisplayOpen();

  return (
    <Card
      component={Link}
      href={`?contactId=${contact?.id}`}
      className={`${classes.wrapper} ${params.get("contactId") === contact?.id && classes.highlighted_wrapper}`}
      onClick={() => setIsChatDisplayOpen(true)}
    >
      <Stack className={classes.inner}>
        <Group className={classes.chat_card_header}>
          <Text
            className={classes.chat_recepient_name}
            title={contact?.name}
            truncate
          >
            {contact?.name ?? contact?.phone}
          </Text>
          <Group gap={"xs"}>
            <WaInboxSessionBadge
              timeStamp={contact?.userInitiatedFinalTimeStamp}
            />
            <Text className={classes.chat_time}>
              {formatToCustomTime(contact?.lastMessage?.waCreatedAt)}
            </Text>
          </Group>
        </Group>
        <Tooltip
          position="bottom-start"
          label={
            parseWaMessage(lastMessage?.messageBody).messageContent ??
            "No messages yet"
          }
        >
          <Text className={classes.latest_chat} truncate>
            {returnMessageContentBasedOnParsedMessage(
              parseWaMessage(lastMessage?.messageBody),
            )}
          </Text>
        </Tooltip>
      </Stack>
    </Card>
  );
}
