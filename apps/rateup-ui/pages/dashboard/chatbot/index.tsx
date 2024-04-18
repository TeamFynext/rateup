import { SimpleGrid, Stack } from "@mantine/core";
import ChatbotMessageContainer from "../../../components/ChatBot/ChatbotMessageContainer";
import ChatbotResources from "../../../components/ChatBot/ChatbotResources";
import { useListState } from "@mantine/hooks";
import { useState } from "react";
import {
  useChatMutation,
  useDeleteChatHistory,
} from "../../../backend/chatbot/chatbot.query";
import { ChatBotSource } from "../../../types/enums";
import { ChatBotMessage } from "../../../types/global";
import PublishChatbot from "../../../components/ChatBot/PublishChatBot";

const ChatBot = () => {
  const [inputQuery, setInputQuery] = useState("");
  const [messages, handler] = useListState<ChatBotMessage>([]);
  const messageMutate = useChatMutation();
  const deleteChatMutation = useDeleteChatHistory();

  const handleSendQuery = () => {
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
  return (
    <Stack py={"sm"}>
      <PublishChatbot />
      <SimpleGrid cols={2}>
        <ChatbotMessageContainer
          inputQuery={inputQuery}
          setInputQuery={setInputQuery}
          messages={messages}
          handleNewChat={handleNewChat}
          handleSendQuery={handleSendQuery}
          isMessagePending={messageMutate.isPending}
          isDeleteMessagePending={deleteChatMutation.isPending}
        />
        <ChatbotResources />
      </SimpleGrid>
    </Stack>
  );
};

export default ChatBot;
