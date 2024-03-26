import { Card, Group, Stack, Text, Tooltip } from "@mantine/core";
import classes from "./styles.module.css";
import { WaContact } from "../../../../../types/global";
import { useRouter } from "next/router";
import { useSearchParams } from "next/navigation";
import { formatToCustomTime } from "../../../../../utils/dateTime";
import {
  parseWaMessage,
  returnMessageContentBasedOnParsedMessage,
} from "../../../../../utils/whatsapp/inbox";
import WaInboxSessionBadge from "./sessionBadge";
export default function WaInboxChatSelectCard(props: WaContact) {
  const router = useRouter();
  const params = useSearchParams();
  function handleChatCardClick() {
    router.push(`?waContactId=${props.id}`);
  }

  return (
    <Card
      className={`${classes.wrapper} ${params.get("waContactId") === props?.id && classes.highlighted_wrapper}`}
      onClick={handleChatCardClick}
    >
      <Stack className={classes.inner}>
        <Group className={classes.chat_card_header}>
          <Text className={classes.chat_recepient_name}>{props?.name}</Text>
          <Group className={classes.chat_time_wrapper}>
            <WaInboxSessionBadge
              timeStamp={props?.userInitiatedFinalTimeStamp}
            />
            <Text className={classes.chat_time}>
              {formatToCustomTime(props?.lastMessage?.waCreatedAt)}
            </Text>
          </Group>
        </Group>
        <Tooltip
          position="bottom-start"
          label={
            parseWaMessage(props.lastMessage.messageBody).messageContent ??
            "No messages yet"
          }
        >
          <Text className={classes.latest_chat} truncate>
            {returnMessageContentBasedOnParsedMessage(
              parseWaMessage(props.lastMessage.messageBody),
            )}
          </Text>
        </Tooltip>
      </Stack>
    </Card>
  );
}
