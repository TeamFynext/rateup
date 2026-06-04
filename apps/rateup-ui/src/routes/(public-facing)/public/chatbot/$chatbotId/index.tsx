"use client";

import { useState } from "react";

import { Center, Image, Stack, Text } from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { isEmptyObject } from "@tiptap/react";
import { v4 as uuid } from "uuid";

import { ChatbotPublicPageStatus, ChatBotSource } from "@/types/enums.ts";
import type { ChatBotMessage } from "@/types/global";
import useLocalStorage from "@/hooks/localStorage.tsx";
import {
  useDeletePublicChatHistory,
  useGetChatbotPublicPageStatus,
  usePublicChatMutation,
} from "@/backend/chatbot/chatbot.query";
import ChatbotMessageContainer from "@/components/ChatBot/ChatbotMessageContainer.tsx";

export const Route = createFileRoute(
  "/(public-facing)/public/chatbot/$chatbotId/",
)({
  component: ChatbotId,
  head: ({ params }) => ({
    meta: [
      { title: "ChatBot" },
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:site_name",
        content: "Rateup",
      },
      {
        property: "og:url",
        content: `https://rateup.app/public/chatbot/${params.chatbotId}`,
      },
      {
        property: "og:title",
        content: "ChatBot",
      },
      {
        property: "og:image",
        content: "https://djd7kjh9uwow0.cloudfront.net/images/rateup_logo.png",
      },
      {
        property: "og:image:width",
        content: "1086",
      },
      {
        property: "og:image:height",
        content: "832",
      },
      {
        property: "og:image:alt",
        content: "Org Icon",
      },
      {
        name: "description",
        content:
          "RateUp is the #1 AI-powered WhatsApp Business API & omnichannel customer engagement platform. The only inbox for chat automation, collect feedback & build loyalty.",
      },
    ],
  }),
});

function ChatbotId() {
  const params = useParams({
    strict: false,
  });
  const chatbotId = params.chatbotId as string;

  const [messages, handler] = useListState<ChatBotMessage>([]);
  const [inputQuery, setInputQuery] = useState("");
  const publicMessageMutate = usePublicChatMutation();
  const { data: chatbotStatus } = useGetChatbotPublicPageStatus(chatbotId);
  const deleteChatHistory = useDeletePublicChatHistory();
  const [, setChatbotUserId] = useLocalStorage("chatbotUserId", "");
  const handleSendQuery = () => {
    if (!inputQuery.trim().length) return;
    const chatbotUserIdStr = localStorage.getItem("chatbotUserId");
    let userId = chatbotUserIdStr ? JSON.parse(chatbotUserIdStr) : null;
    if (!userId || isEmptyObject(userId)) {
      userId = uuid();
      setChatbotUserId(userId);
    }
    handler.append({ content: inputQuery, source: ChatBotSource.HUMAN });
    setInputQuery("");
    publicMessageMutate.mutate(
      { query: inputQuery, chatbotId, userId },
      {
        onSuccess: (data) => {
          handler.append({ content: data.message, source: ChatBotSource.AI });
        },
        onError: (error) => {
          handler.append({
            content: error.message,
            source: ChatBotSource.AI,
          });
        },
      },
    );
  };

  const handleNewChat = () => {
    const chatbotUserIdStr = localStorage.getItem("chatbotUserId");
    const userId = chatbotUserIdStr ? JSON.parse(chatbotUserIdStr) : null;
    deleteChatHistory.mutate(
      { userId },
      {
        onSuccess: () => {
          handler.setState([]);
        },
      },
    );
  };

  return (
    <Center h={"100vh"}>
      {chatbotStatus?.publicPageStatus === ChatbotPublicPageStatus.ACTIVE ? (
        <ChatbotMessageContainer
          inputQuery={inputQuery}
          setInputQuery={setInputQuery}
          messages={messages}
          handleNewChat={handleNewChat}
          handleSendQuery={handleSendQuery}
          isMessagePending={publicMessageMutate.isPending}
          isDeleteMessagePending={deleteChatHistory.isPending}
          styleProps={{ width: "80%", height: "100vh", paddingTop: "10px" }}
          isPublicPage={true}
        />
      ) : (
        <Stack justify="center" align="center">
          <Image
            src={`${import.meta.env.VITE_FRONTEND_URL}/images/bw-logo.png`}
            alt="Logo"
            w={80}
            h={80}
            fit={"contain"}
          />
          <Text c="#CDCDCD" fw={"bold"} fz={28}>
            Page Not Available..!
          </Text>
        </Stack>
      )}
    </Center>
  );
}
