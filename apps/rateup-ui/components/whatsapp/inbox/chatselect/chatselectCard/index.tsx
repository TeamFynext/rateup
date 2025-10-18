"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Badge, Card, Flex, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconRosetteDiscountCheckFilled } from "@tabler/icons-react";
import dayjs from "dayjs";

import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums";
import { cn } from "@/lib/utils";
import { useSetIsChatDisplayOpen } from "@/app/dashboard/inbox/ChatDisplayContext";
import useContactStore, { useContactsStore } from "@/app/dashboard/inbox/store";
import { ContactsWithLastMessage } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { useUser } from "@/context/UserContext";
import {
  parseWaMessage,
  returnMessageContentBasedOnParsedMessage,
} from "@/utils/whatsapp/inbox";

import { WaInboxSessionAvatar } from "./sessionBadge";
import classes from "./styles.module.css";

interface WaInboxChatSelectCardProps {
  contact: ContactsWithLastMessage;
  waSettings: WaSettings;
}
export default function WaInboxChatSelectCard({
  contact,
}: Readonly<WaInboxChatSelectCardProps>) {
  const params = useSearchParams();
  const lastMessage = contact?.lastMessage;

  const setIsChatDisplayOpen = useSetIsChatDisplayOpen();
  let tab = params.get("tab") ?? "New";

  const { setSelectedContact, selectedContact } = useContactsStore();

  const platform = contact?.source?.toUpperCase() || MessagePlatform.WHATSAPP;
  const isInsta = platform === MessagePlatform.INSTAGRAM;

  return (
    <Card
      className={`${classes.wrapper} ${selectedContact?.id === contact?.id && classes.highlighted_wrapper}`}
      onClick={() => {
        setIsChatDisplayOpen(true);
        setSelectedContact(contact);
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
              <Text
                className={cn(classes.latest_chat, "line-clamp-1 break-all")}
              >
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
          {lastMessage && (
            <Flex justify={"space-between"}>
              <Group gap={4}>
                {contact?.lastReceivedMessageTimeStamp &&
                  dayjs().diff(contact.lastReceivedMessageTimeStamp, "hour") <
                    24 && (
                    <Badge color="red" variant="filled" size="xs" radius="sm">
                      New
                    </Badge>
                  )}
                {contact?.lifecycleName ? (
                  <Badge color="blue" variant="light" size="xs" radius={"sm"}>
                    {contact?.lifecycleName}
                  </Badge>
                ) : (
                  <Badge variant="transparent" size="xs" />
                )}
              </Group>
              {contact?.unReadMessageCount ? (
                <Badge color={isInsta ? "#cc2960" : "#128c7e"} radius={"xl"}>
                  {contact?.unReadMessageCount}
                </Badge>
              ) : null}
            </Flex>
          )}
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
  if (contact?.waMessageAssignStatus === WaMessageAssignStatus.ASSIGNED)
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
