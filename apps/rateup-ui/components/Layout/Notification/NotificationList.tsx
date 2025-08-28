"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Flex,
  Group,
  ScrollArea,
  ScrollAreaAutosize,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconBrandWhatsappFilled,
  IconExternalLink,
  IconTicket,
  IconX,
} from "@tabler/icons-react";

import {
  useDeleteAllNotifications,
  useDeleteNotification,
  useNotifications,
} from "@/backend/notification/notification.query";
import {
  RateupButtonBlue,
  RateupButtonPrimary,
} from "@/components/Button/RateupButtons";
import RateupLoader from "@/components/Loaders/RateupLoader";
import NothingFound from "@/components/NothingFound/NothingFound";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import { formatToRelativeTime } from "@/utils/dateTime";

const NotificationList = ({ close, data, isLoading }) => {
  const deleteNotificationMut = useDeleteNotification();
  const deleteAll = useDeleteAllNotifications();
  const getNotificationIcon = useCallback((source) => {
    switch (source) {
      case "whatsapp":
        return <IconBrandWhatsappFilled color="#25D366" />;
      case "ticket":
        return <IconTicket />;
    }
  }, []);

  const getNotificationMessageComp = useCallback((notification) => {
    const { subSource, data } = notification;
    switch (subSource) {
      case "chat-assigned":
        return (
          <Stack gap={2}>
            <Text size="sm" w={280}>
              A chat from{" "}
              <Text component="span" fw={500}>
                {data?.contactName}
              </Text>{" "}
              has been assigned to you.
              <Anchor
                component={Link}
                onClick={() => close()}
                href={`/dashboard/whatsapp/inbox?tab=AssignedToMe&contactId=${data?.contactId}`}
              >
                {" "}
                Show chat
              </Anchor>
            </Text>
          </Stack>
        );
      case "chat-closed":
        return (
          <Stack gap={2}>
            <Text size="sm" w={280}>
              Chat from {data?.contactName} has been closed.
              <Anchor
                component={Link}
                onClick={() => close()}
                href={`/dashboard/inbox?tab=closed&contactId=${data?.contactId}`}
              >
                {" "}
                Show chat
              </Anchor>
            </Text>
          </Stack>
        );
      case "ticket-assigned":
        return (
          <Stack gap={2}>
            <Text size="sm" w={280}>
              A ticket from board {data?.board_name} has been assigned to you.
              <Anchor
                component={Link}
                onClick={() => close()}
                href={`/dashboard/tickets/${data?.cardId}`}
              >
                {" "}
                Show ticket
              </Anchor>
            </Text>
          </Stack>
        );
    }
  }, []);
  if (isLoading) return <RateupLoader />;
  if (data?.length === 0) return <NothingFound text="No notifications found" />;
  return (
    <Stack h={"100%"} gap={"xs"}>
      <Flex justify={"flex-end"}>
        <RateupButtonPrimary
          variant="light"
          title="clear"
          onClick={() => deleteAll.mutate()}
        />
      </Flex>
      <ScrollArea offsetScrollbars scrollbarSize={6} h={"calc(100vh - 180px)"}>
        <Stack p={"xs"} gap={"xs"}>
          {data?.map((notification) => (
            <PaperLayout key={notification?.id} bg={"var(--shade-of-blue)"}>
              <Flex justify={"space-between"}>
                <Flex gap={"xs"}>
                  {getNotificationIcon(notification?.source)}
                  <Stack gap={2}>
                    <Group justify="space-between">
                      {getNotificationMessageComp(notification)}
                    </Group>
                    <Text size="xs" c={"dimmed"}>
                      {formatToRelativeTime(notification?.createdAt)}
                    </Text>
                  </Stack>
                </Flex>
                <ActionIcon
                  variant="subtle"
                  size={"xs"}
                  onClick={() => deleteNotificationMut.mutate(notification?.id)}
                >
                  <IconX />
                </ActionIcon>
              </Flex>
            </PaperLayout>
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
};

export default NotificationList;
