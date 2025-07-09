import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  Badge,
  Card,
  Group,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import dayjs from "dayjs";

import { WaMessageAssignStatus } from "@/types/enums";
import { ContactsWithLastMessage } from "@/backend/whatsapp/inbox/message/wamessage.api";
import TimeSinceText from "@/components/DateAndTime/TimeSinceText";
import { useSetIsChatDisplayOpen } from "@/pages/dashboard/whatsapp/inbox/ChatDisplayContext";
import useContactStore from "@/pages/dashboard/whatsapp/inbox/store";
import { formatToRelativeTime } from "@/utils/dateTime";
import {
  parseWaMessage,
  returnMessageContentBasedOnParsedMessage,
} from "@/utils/whatsapp/inbox";

import { WaInboxSessionAvatar } from "./sessionBadge";
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
  const { setSelectedContact, selectedContact, addOpenedContactIds } =
    useContactStore();
  let tab = params.get("tab") ?? "New";

  return (
    <Card
      component={Link}
      href={`?tab=${tab}&contactId=${contact?.id}`}
      className={`${classes.wrapper} ${params.get("contactId") === contact?.id && classes.highlighted_wrapper}`}
      onClick={() => {
        setIsChatDisplayOpen(true);
        setSelectedContact(contact);
        addOpenedContactIds(contact.id);
      }}
      py={"xs"}
    >
      <Group>
        <WaInboxSessionAvatar
          timeStamp={contact?.lastReceivedMessageTimeStamp}
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
              {contact?.name || contact?.whatsappUserName || contact?.phone}
            </Text>
            <Group gap="xs">
              {contact.unReadMessageCount &&
                contact?.id !== selectedContact?.id && (
                  <Badge radius={"xl"}>{contact?.unReadMessageCount}</Badge>
                )}
              <AssignedStatusBadge contact={contact} />
            </Group>
          </Group>
          <Group justify="space-between">
            <Tooltip
              position="bottom-start"
              label={
                lastMessage
                  ? parseWaMessage(lastMessage?.messageBody).messageContent
                  : "No messages yet"
              }
            >
              <Text className={classes.latest_chat} truncate maw={200}>
                {lastMessage &&
                  returnMessageContentBasedOnParsedMessage(
                    parseWaMessage(lastMessage?.messageBody),
                    lastMessage.messageBody.exchangeProcess,
                  )}
              </Text>
            </Tooltip>
            <Text className={classes.chat_time}>
              {contact?.lastMessage &&
                dayjs.utc(contact?.lastMessage?.waCreatedAt).fromNow()}
            </Text>
          </Group>
        </Stack>
      </Group>
    </Card>
  );
}

const AssignedStatusBadge = ({
  contact,
}: {
  contact: ContactsWithLastMessage;
}) => {
  if (contact.waMessageAssignStatus === WaMessageAssignStatus.ASSIGNED)
    return (
      <Group>
        {contact?.assignedUsers?.map((u) => (
          <Badge variant="light" size="xs" radius={"xs"} key={u?.id}>
            {u?.name}
          </Badge>
        ))}
      </Group>
    );
  return (
    <Badge variant="light" size="xs" radius={"xs"}>
      {contact?.waMessageAssignStatus}
    </Badge>
  );
};
