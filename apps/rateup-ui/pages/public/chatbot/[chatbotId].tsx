import { useState } from "react";
import ChatbotMessageContainer from "../../../components/ChatBot/ChatbotMessageContainer";
import { useRouter } from "next/router";
import { useListState } from "@mantine/hooks";
import {
  useDeletePublicChatHistory,
  usePublicChatMutation,
} from "../../../backend/chatbot/chatbot.query";
import { ChatBotSource } from "../../../types/enums";
import { ChatBotMessage } from "../../../types/global";
import Head from "next/head";
import { Center } from "@mantine/core";
import useLocalStorage from "../../../hooks/localStorage";
import { v4 as uuid } from "uuid";

const index = () => {
  const router = useRouter();
  const { chatbotId } = router.query as { chatbotId: string };
  const [messages, handler] = useListState<ChatBotMessage>([]);
  const [inputQuery, setInputQuery] = useState("");
  const publicMessageMutate = usePublicChatMutation();
  const deleteChatHistory = useDeletePublicChatHistory();
  const [chatbotUserId, setChatbotUserId] = useLocalStorage(
    "chatbotUserId",
    null,
  );
  const handleSendQuery = () => {
    let userId = JSON.parse(localStorage?.getItem("chatbotUserId"));
    if (!userId) {
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
        onError: (error: any) => {
          handler.append({
            content: error.response.data.message,
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
        <ChatbotMessageContainer
          inputQuery={inputQuery}
          setInputQuery={setInputQuery}
          messages={messages}
          handleNewChat={handleNewChat}
          handleSendQuery={handleSendQuery}
          isMessagePending={publicMessageMutate.isPending}
          isDeleteMessagePending={deleteChatHistory.isPending}
          styleProps={{ width: 700 }}
        />
      </Center>
    </>
  );
};

export default index;
