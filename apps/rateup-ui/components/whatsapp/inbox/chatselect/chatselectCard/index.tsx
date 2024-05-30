import { Card, Group, Stack, Text, Tooltip } from "@mantine/core";
import classes from "./styles.module.css";
import { useSearchParams } from "next/navigation";
import { formatToCustomTime } from "../../../../../utils/dateTime";
import {
  parseWaMessage,
  returnMessageContentBasedOnParsedMessage,
} from "../../../../../utils/whatsapp/inbox";
import WaInboxSessionBadge from "./sessionBadge";
import { ContactsWithLastMessage } from "../../../../../backend/whatsapp/inbox/message/wamessage.api";
import Link from "next/link";

interface WaInboxChatSelectCardProps {
  contact: ContactsWithLastMessage;
}
export default function WaInboxChatSelectCard({
  contact,
}: WaInboxChatSelectCardProps) {
  const params = useSearchParams();
  const lastMessage = contact?.lastMessage;
  return (
    <Card
      component={Link}
      href={`?contactId=${contact?.id}`}
      className={`${classes.wrapper} ${params.get("contactId") === contact?.id && classes.highlighted_wrapper}`}
    >
      <Stack className={classes.inner}>
        <Group className={classes.chat_card_header}>
          <Text
            className={classes.chat_recepient_name}
            title={contact?.name}
            truncate
          >
            {contact?.name}
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
