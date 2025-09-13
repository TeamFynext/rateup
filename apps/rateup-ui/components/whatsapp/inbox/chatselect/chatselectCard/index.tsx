"use client";

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
import {
  IconBrandWhatsappFilled,
  IconRosetteDiscountCheckFilled,
  IconWebhook,
} from "@tabler/icons-react";
import dayjs from "dayjs";

import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums";
import { cn } from "@/lib/utils";
import { useSetIsChatDisplayOpen } from "@/app/dashboard/whatsapp/inbox/ChatDisplayContext";
import useContactStore from "@/app/dashboard/whatsapp/inbox/store";
import { ContactsWithLastMessage } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import TimeSinceText from "@/components/DateAndTime/TimeSinceText";
import { formatToRelativeTime } from "@/utils/dateTime";
import {
  parseWaMessage,
  returnMessageContentBasedOnParsedMessage,
} from "@/utils/whatsapp/inbox";

import { InstagramIcon } from "../../chatdisplay/chatdisplayHeader";
import { WaInboxSessionAvatar } from "./sessionBadge";
import classes from "./styles.module.css";

interface WaInboxChatSelectCardProps {
  contact: ContactsWithLastMessage;
  waSettings: WaSettings;
}
export default function WaInboxChatSelectCard({
  contact,
  waSettings,
}: Readonly<WaInboxChatSelectCardProps>) {
  const params = useSearchParams();
  const lastMessage = contact?.lastMessage;

  const setIsChatDisplayOpen = useSetIsChatDisplayOpen();
  const { setSelectedContact, selectedContact, addOpenedContactIds } =
    useContactStore();
  let tab = params.get("tab") ?? "New";

  const platform = contact?.source?.toUpperCase() || MessagePlatform.WHATSAPP;
  const isInsta = platform === MessagePlatform.INSTAGRAM;
  let leftSectionIcon: React.ReactNode;

  switch (platform) {
    case MessagePlatform.INSTAGRAM:
      leftSectionIcon = <InstagramIcon size={13} />;
      break;
    case MessagePlatform.WEBCHAT:
      leftSectionIcon = <IconWebhook size={13} color="#25D366" />;
      break;
    case MessagePlatform.WHATSAPP:
    default:
      leftSectionIcon = <IconBrandWhatsappFilled size={13} color="#25D366" />;
      break;
  }

  function getMessageSourceName(sourceIdentifier) {
    const settings = waSettings?.find(
      (setting) =>
        sourceIdentifier === setting.ibaId ||
        sourceIdentifier === setting.phone ||
        `+${sourceIdentifier}` === setting.phone,
    );
    if (isInsta)
      return (settings?.igDisplayName ?? settings?.igUserName)
        ? `@${settings?.igUserName}`
        : sourceIdentifier;
    return settings?.phoneDisplayName || settings?.phone || sourceIdentifier;
  }
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
          {lastMessage && (
            <Flex justify={"space-between"}>
              <Badge
                tt={"initial"}
                size="xs"
                radius={"sm"}
                p={1}
                variant="light"
                color={isInsta ? "#cc2960" : "#25D366"}
                leftSection={leftSectionIcon}
              >
                {getMessageSourceName(lastMessage?.sourceIdentifier)}
              </Badge>
              {contact.unReadMessageCount
                ? contact?.id !== selectedContact?.id && (
                    <Badge
                      color={isInsta ? "#cc2960" : "#128c7e"}
                      radius={"xl"}
                    >
                      {contact?.unReadMessageCount}
                    </Badge>
                  )
                : null}
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
