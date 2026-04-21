"use client";

import React, { useMemo, useState } from "react";

import {
  Avatar,
  Badge,
  Divider,
  Flex,
  Group,
  ScrollAreaAutosize,
  Stack,
  Text,
} from "@mantine/core";
import { IconRobotFace, IconUserFilled } from "@tabler/icons-react";

import { ChatBotSource } from "@/types/enums";
import { useGetUserAiChats } from "@/backend/chatbot/chatbot.query";
import { formatDate, formatToCustomTime } from "@/utils/dateTime";

import RefreshButton from "../Button/RefreshButton";
import PaperLayout from "../styled/Layouts/PaperLayout";
import ChatSelectSkeletonCardList from "../whatsapp/inbox/chatselect/chatselectCard/Skeleton";
import classes from "./ChatbotStyle.module.css";

const ChatHistory = ({ enableApi, selectedChatbotId }) => {
  const { data: chats, isLoading } = useGetUserAiChats(
    enableApi,
    selectedChatbotId,
  );
  const userChats = useMemo(() => {
    if (!chats) return null;
    const userChats = Object.groupBy(chats, ({ userId }) => userId);
    return Object.entries(userChats || {}).map(
      ([userId, userChat]: [string, UserChat[]]) => ({
        userId,
        userDetails: userChat[0].user,
        chats: userChat.map((c) => ({
          message: c.message,
          createdAt: c.createdAt,
          source: c.source,
        })),
      }),
    );
  }, [chats]);

  const [selectedChat, setSelectedChat] = useState(null);

  return (
    <Flex gap={"xs"} h={"100%"}>
      <AIChatSelect
        userChats={userChats}
        setSelectedChat={setSelectedChat}
        isLoading={isLoading}
      />
      <AIChatDisplay selectedChat={selectedChat} />
    </Flex>
  );
};

type UserChat = {
  userId: string;
  user: {
    name: string;
    phone?: string;
    email?: string;
  };
  message: string;
  createdAt: string;
  source: string;
};

const AIChatSelect = ({ userChats, setSelectedChat, isLoading }) => {
  return (
    <PaperLayout flex={0.5} p={0}>
      <Stack p={0} gap={0}>
        <Group gap={1}>
          <Text fw={500} p={"sm"}>
            Chats
          </Text>
          <RefreshButton queryKeys={["aiChat"]} />
        </Group>
        <Divider />
        <ScrollAreaAutosize mah={"58dvh"} scrollbarSize={4}>
          {isLoading ? (
            <ChatSelectSkeletonCardList />
          ) : userChats?.length > 0 ? (
            userChats?.map((user) => (
              <AIChatSelectCard
                user={user}
                key={user.userId}
                setSelectedChat={setSelectedChat}
              />
            ))
          ) : (
            <Text size="sm" p="sm">
              No Chats Found
            </Text>
          )}
        </ScrollAreaAutosize>
      </Stack>
    </PaperLayout>
  );
};

const AIChatSelectCard = ({ user, setSelectedChat }) => {
  return (
    <Stack
      gap={0}
      p={0}
      className={classes["chat-select"]}
      onClick={() => setSelectedChat(user)}
    >
      <Group gap={2} px={"xs"}>
        <Avatar color="initials" name={user.userDetails.name} />
        <Stack p={"xs"} gap={2} flex={1}>
          <Text fw={500} size="sm">
            {user.userDetails.name}
          </Text>
          <Group justify="space-between">
            <Text size="xs" c={"dimmed"} truncate w={"60%"}>
              {user.chats[user.chats.length - 1].message}
            </Text>
            <Text size="xs">
              {formatDate(user.chats[user.chats.length - 1].createdAt)}
            </Text>
          </Group>
        </Stack>
      </Group>
      <Divider />
    </Stack>
  );
};

const AIChatDisplay = ({ selectedChat }) => {
  const chats = selectedChat
    ? Object.groupBy(selectedChat?.chats, ({ createdAt }) =>
        formatDate(createdAt),
      )
    : [];

  if (!selectedChat)
    return (
      <PaperLayout
        flex={1}
        display={"flex"}
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <Text fw={400}>Select a chat</Text>
      </PaperLayout>
    );

  return (
    <PaperLayout flex={1} p={0}>
      <Stack bg="var(--bg-grey-color)" p={0} h={"100%"}>
        <Stack bg="var(--primary-color)" p={"sm"}>
          <Group gap={"xs"}>
            <Avatar color="initials" name={selectedChat.userDetails.name} />
            <Text fw={500} size="lg">
              {selectedChat.userDetails.name}
            </Text>
          </Group>
        </Stack>
        <ScrollAreaAutosize h={"80%"} scrollbarSize={4}>
          <Stack flex={1}>
            {Object.keys(chats).map((date) => (
              <Stack>
                <Group>
                  <Divider flex={1} />
                  <Badge radius={"xs"} variant="light">
                    {date}
                  </Badge>
                  <Divider flex={1} />
                </Group>
                {chats[date].map((chat) => (
                  <PaperLayout
                    mx={"sm"}
                    w={"fit-content"}
                    p="xs"
                    radius={"sm"}
                    style={{
                      alignSelf:
                        chat.source === ChatBotSource.HUMAN
                          ? "flex-start"
                          : "flex-end",
                    }}
                  >
                    <Group gap={2}>
                      {chat.source == ChatBotSource.HUMAN ? (
                        <IconUserFilled size={"1rem"} />
                      ) : (
                        <IconRobotFace size={"1rem"} />
                      )}
                      <Text fw={500} size="sm">
                        {chat.source == ChatBotSource.HUMAN
                          ? selectedChat.userDetails.name
                          : "AI"}
                      </Text>
                    </Group>
                    <Text size="sm" c="var(--grey-color-3)">
                      {chat.message}
                    </Text>
                    <Text size="xs" c="dimmed" ta={"end"}>
                      {formatToCustomTime(chat.createdAt)}
                    </Text>
                  </PaperLayout>
                ))}
              </Stack>
            ))}
          </Stack>
        </ScrollAreaAutosize>
      </Stack>
    </PaperLayout>
  );
};
export default ChatHistory;
