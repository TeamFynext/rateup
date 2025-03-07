import { useState } from "react";

import { SimpleGrid, Stack, Tabs } from "@mantine/core";
import { useListState } from "@mantine/hooks";
import {
  IconAi,
  IconBrandWhatsapp,
  IconFile,
  IconMessageChatbot,
  IconRobot,
  IconRobotFace,
} from "@tabler/icons-react";

import ChatHistory from "@/components/ChatBot/ChatHistory";

import {
  useChatMutation,
  useDeleteChatHistory,
} from "../../../backend/chatbot/chatbot.query";
import ChatbotMessageContainer from "../../../components/ChatBot/ChatbotMessageContainer";
import ChatbotResources from "../../../components/ChatBot/ChatbotResources";
import PublishChatbot from "../../../components/ChatBot/PublishChatBot";
import { ChatBotSource } from "../../../types/enums";
import { ChatBotMessage } from "../../../types/global";
import { WhatsAppAIChatConfiguration } from "../whatsapp/settings";

enum ChatbotTab {
  ChatBot = "ChatBot",
  Resources = "Resources",
  WaSettings = "WhatsApp Settings",
  UserChats = "User Chats",
}

const ChatBot = () => {
  const [inputQuery, setInputQuery] = useState("");
  const [messages, handler] = useListState<ChatBotMessage>([]);
  const messageMutate = useChatMutation();
  const deleteChatMutation = useDeleteChatHistory();
  const [activetab, setActiveTab] = useState(ChatbotTab.ChatBot);

  const handleSendQuery = () => {
    if (!inputQuery.trim().length || messageMutate.isPending) return;
    handler.append({ content: inputQuery, source: ChatBotSource.HUMAN });
    setInputQuery("");
    messageMutate.mutate(
      { query: inputQuery },
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
    deleteChatMutation.mutate(null, {
      onSuccess: () => {
        handler.setState([]);
      },
    });
  };

  function getTabLeftIcon(tab: ChatbotTab) {
    switch (tab) {
      case ChatbotTab.ChatBot:
        return <IconRobotFace size={"1.2rem"} color={"var(--grey-color)"} />;
      case ChatbotTab.Resources:
        return <IconFile size={"1.2rem"} color={"var(--grey-color)"} />;
      case ChatbotTab.WaSettings:
        return (
          <IconBrandWhatsapp size={"1.2rem"} color={"var(--grey-color)"} />
        );
      case ChatbotTab.UserChats:
        return (
          <IconMessageChatbot size={"1.2rem"} color={"var(--grey-color)"} />
        );
    }
  }
  return (
    <Stack p={"sm"}>
      <PublishChatbot />
      <Tabs
        defaultValue={ChatbotTab.ChatBot}
        value={activetab}
        onChange={(value) => setActiveTab(value as ChatbotTab)}
      >
        <Tabs.List>
          {Object.values(ChatbotTab).map((tab) => (
            <Tabs.Tab
              value={tab}
              key={tab}
              bg={activetab === tab ? "var(--shade-of-blue)" : undefined}
              leftSection={getTabLeftIcon(tab)}
            >
              {tab}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <Tabs.Panel value={ChatbotTab.ChatBot} p={"sm"}>
          <ChatbotMessageContainer
            inputQuery={inputQuery}
            setInputQuery={setInputQuery}
            messages={messages}
            handleNewChat={handleNewChat}
            handleSendQuery={handleSendQuery}
            isMessagePending={messageMutate.isPending}
            isDeleteMessagePending={deleteChatMutation.isPending}
            isPublicPage={false}
          />
        </Tabs.Panel>
        <Tabs.Panel value={ChatbotTab.Resources} p={"sm"}>
          <ChatbotResources />
        </Tabs.Panel>
        <Tabs.Panel value={ChatbotTab.WaSettings}>
          <WhatsAppAIChatConfiguration />
        </Tabs.Panel>
        <Tabs.Panel value={ChatbotTab.UserChats} p={"sm"} h={"73dvh"}>
          <ChatHistory />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

export default ChatBot;
