"use client";

import { useState } from "react";
import Head from "next/head";
import { useParams, useRouter } from "next/navigation";

import { Center, Image, Stack, Text } from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { isEmptyObject } from "@tiptap/react";
import { v4 as uuid } from "uuid";

import {
  useDeletePublicChatHistory,
  useGetChatbotPublicPageStatus,
  usePublicChatMutation,
} from "../../../../backend/chatbot/chatbot.query";
import ChatbotMessageContainer from "../../../../components/ChatBot/ChatbotMessageContainer";
import useLocalStorage from "../../../../hooks/localStorage";
import {
  ChatbotPublicPageStatus,
  ChatBotSource,
} from "../../../../types/enums";
import { ChatBotMessage } from "../../../../types/global";

const ChatbotId = () => {
  const params = useParams();
  const chatbotId = params.chatbotId as string;

  const [messages, handler] = useListState<ChatBotMessage>([]);
  const [inputQuery, setInputQuery] = useState("");
  const publicMessageMutate = usePublicChatMutation();
  const { data: chatbotStatus } = useGetChatbotPublicPageStatus(chatbotId);
  const deleteChatHistory = useDeletePublicChatHistory();
  const [chatbotUserId, setChatbotUserId] = useLocalStorage(
    "chatbotUserId",
    "",
  );
  const handleSendQuery = () => {
    if (!inputQuery.trim().length) return;
    let userId = JSON.parse(localStorage?.getItem("chatbotUserId"));
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
            content: error?.message,
            source: ChatBotSource.AI,
          });
        },
      },
    );
  };

  const handleNewChat = () => {
    deleteChatHistory.mutate(
      { userId: JSON.parse(localStorage?.getItem("chatbotUserId")) },
      {
        onSuccess: () => {
          handler.setState([]);
        },
      },
    );
  };

  return (
    <>
      <Head>
        <title>ChatBot</title>
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Rateup" />
        <meta
          property="og:url"
          content={`https://rateup.app/public/chatbot/${chatbotId}`}
        />
        <meta property="og:title" content={"ChatBot"} />
        <meta
          property="og:image"
          content={
            "https://djd7kjh9uwow0.cloudfront.net/images/rateup_logo.png"
          }
        />
        <meta property="og:image:width" content="1086" />
        <meta property="og:image:height" content="832" />
        <meta property="og:image:alt" content="Org Icon" />
      </Head>
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
              src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/bw-logo.png`}
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
    </>
  );
};

export default ChatbotId;
