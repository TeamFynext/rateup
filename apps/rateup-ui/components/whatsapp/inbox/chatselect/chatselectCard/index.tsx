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
import { useQueryClient } from "@tanstack/react-query";
import { ContactsWithLastMessage } from "../../../../../backend/whatsapp/inbox/message/wamessage.api";

interface WaInboxChatSelectCardProps {
  contact: ContactsWithLastMessage;
}
export default function WaInboxChatSelectCard({
  contact,
}: WaInboxChatSelectCardProps) {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  function handleChatCardClick() {
    router.push(`?contactId=${contact.id}`);
    queryClient.invalidateQueries({
      queryKey: ["wa-messages", contact?.id],
    });
  }
  const lastMessage = contact.WaMessage[0];
  return (
    <Card
      className={`${classes.wrapper} ${params.get("contactId") === contact?.id && classes.highlighted_wrapper}`}
      onClick={handleChatCardClick}
    >
      <Stack className={classes.inner}>
        <Group className={classes.chat_card_header}>
          <Text className={classes.chat_recepient_name}>{contact?.name}</Text>
          <Text className={classes.chat_time}>
            {formatToCustomTime(lastMessage?.waCreatedAt)}
          </Text>
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
