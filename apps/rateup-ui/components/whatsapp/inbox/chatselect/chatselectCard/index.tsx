import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  Badge,
  Card,
  Flex,
  Group,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconRosetteDiscountCheckFilled } from "@tabler/icons-react";
import dayjs from "dayjs";

import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums";
import { cn } from "@/lib/utils";
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
          profile={contact?.profilePic}
        />
        <Stack className={classes.inner} flex={1}>
          <Flex className={classes.chat_card_header}>
            <Text
              className={cn(
                classes.chat_recepient_name,
                "line-clamp-1 break-all ",
              )}
              title={contact?.name}
              // tt={"capitalize"}
              fw={500}
            >
              {contact?.name ||
                contact?.whatsappUserName ||
                contact?.phone ||
                contact?.igsId}{" "}
              <span>
                {contact?.isIgVerifiedUser && (
                  <IconRosetteDiscountCheckFilled color="blue" size={"1rem"} />
                )}
              </span>
            </Text>
            <Flex gap="xs" justify="flex-end" flex={1}>
              {contact.unReadMessageCount &&
                contact?.id !== selectedContact?.id && (
                  <Badge radius={"xl"}>{contact?.unReadMessageCount}</Badge>
                )}
              <AssignedStatusBadge contact={contact} />
            </Flex>
          </Flex>
          <Flex justify="space-between">
            <Tooltip
              position="bottom-start"
              label={
                lastMessage
                  ? parseWaMessage(lastMessage).messageContent
                  : "No messages yet"
              }
            >
              <Text className={cn(classes.latest_chat, "line-clamp-1 break")}>
                {lastMessage &&
                  returnMessageContentBasedOnParsedMessage(
                    parseWaMessage(lastMessage),
                    lastMessage.messageBody.exchangeProcess,
                  )}
              </Text>
            </Tooltip>
            <Text className={classes.chat_time}>
              {contact?.lastMessage &&
                dayjs.utc(contact?.lastMessage?.waCreatedAt).fromNow()}
            </Text>
          </Flex>
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
      <Flex gap={"xs"}>
        {contact?.assignedUsers?.map((u) => (
          <Badge variant="light" size="xs" radius={"xs"} key={u?.id}>
            {u?.name}
          </Badge>
        ))}
      </Flex>
    );
  return (
    <Badge variant="light" size="xs" radius={"xs"}>
      {contact?.waMessageAssignStatus}
    </Badge>
  );
};
