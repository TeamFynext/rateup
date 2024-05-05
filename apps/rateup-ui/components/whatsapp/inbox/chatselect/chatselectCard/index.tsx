import { Card, Group, Stack, Text, Tooltip } from "@mantine/core";
import classes from "./styles.module.css";
import { useRouter } from "next/router";
import { useSearchParams } from "next/navigation";
import { formatToCustomTime } from "../../../../../utils/dateTime";
import {
  parseWaMessage,
  returnMessageContentBasedOnParsedMessage,
} from "../../../../../utils/whatsapp/inbox";
import WaInboxSessionBadge from "./sessionBadge";
import { ContactsWithLastMessage } from "../../../../../backend/whatsapp/inbox/message/wamessage.api";

interface WaInboxChatSelectCardProps {
  contact: ContactsWithLastMessage;
}
export default function WaInboxChatSelectCard({
  contact,
}: WaInboxChatSelectCardProps) {
  const router = useRouter();
  const params = useSearchParams();
  function handleChatCardClick() {
    router.push(`?contactId=${contact.id}`);
  }
  const lastMessage = contact?.lastMessage;
  return (
    <Card
      className={`${classes.wrapper} ${params.get("contactId") === contact?.id && classes.highlighted_wrapper}`}
      onClick={handleChatCardClick}
    >
      <Stack className={classes.inner}>
        <Group className={classes.chat_card_header}>
          <Text className={classes.chat_recepient_name}>{contact?.name}</Text>
          <Group>
            <WaInboxSessionBadge timeStamp={lastMessage?.waCreatedAt} />
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
