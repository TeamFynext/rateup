"use client";

import { useEffect, useState } from "react";

import { Flex, Select, SimpleGrid, Stack, Tabs } from "@mantine/core";
import { useListState } from "@mantine/hooks";
import {
  IconAi,
  IconBrandWhatsapp,
  IconFile,
  IconMessageChatbot,
  IconPlus,
  IconRobot,
  IconRobotFace,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import ChatHistory from "@/components/ChatBot/ChatHistory";
import CreateNewChatbot from "@/components/ChatBot/CreateNewChatbot";

import {
  useAllChatbots,
  useChatMutation,
  useCreateChatbot,
  useDeleteChatbot,
  useDeleteChatHistory,
} from "../../../backend/chatbot/chatbot.query";
import ChatbotMessageContainer from "../../../components/ChatBot/ChatbotMessageContainer";
import ChatbotResources from "../../../components/ChatBot/ChatbotResources";
import PublishChatbot from "../../../components/ChatBot/PublishChatBot";
import { useChatbotStore } from "../../../store/chatbot.store";
import { ChatBotSource } from "../../../types/enums";
import { ChatBotMessage } from "../../../types/global";
import { WhatsAppAIChatConfiguration } from "../whatsapp/settings/page";

enum ChatbotTab {
  ChatBot = "ChatBot",
  Resources = "Resources",
  WaSettings = "WhatsApp Settings",
  UserChats = "User Chats",
}

const ChatBot = () => {
  const [inputQuery, setInputQuery] = useState("");
  const queryClient = useQueryClient();
  const [messages, handler] = useListState<ChatBotMessage>([]);
  const messageMutate = useChatMutation();
  const deleteChatMutation = useDeleteChatHistory();
  const [activetab, setActiveTab] = useState(ChatbotTab.ChatBot);
  const { setSelectedChatbotId: setGlobalChatbotId } = useChatbotStore();
  const { mutate: deleteChatbot, isPending: isDeletingChatbot } =
    useDeleteChatbot();

  const { confirm, ConfirmDialog } = useConfirmDialog();

  //new
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { mutate: createChatbot } = useCreateChatbot();
  const {
    data: allChatbots,
    isLoading: isLoadingChatbots,
    isError: isErrorChatbots,
  } = useAllChatbots();

  const [selectedChatbotId, setSelectedChatbotId] = useState<string | null>(
    null,
  );

  const handleCreateChatbot = (name: string) => {
    createChatbot(
      { name },
      {
        onSuccess: (newChatbot) => {
          console.log("New chatbot created:", newChatbot);
          toast.success("Chatbot created successfully");

          queryClient.setQueryData(["all-chatbots"], (old: any) => {
            if (!old) return [newChatbot];
            return [...old, newChatbot];
          });

          setSelectedChatbotId(newChatbot.data.id);
          setGlobalChatbotId(newChatbot.data.id);
          setShowCreateModal(false);
        },
      },
    );
  };

  const handleCreateNewChatbotClick = () => {
    setShowCreateModal(true);
  };

  const handleChatbotSelect = (value: string | null) => {
    setSelectedChatbotId(value);
    setGlobalChatbotId(value);
  };
  useEffect(() => {
    if (allChatbots && allChatbots.length > 0 && selectedChatbotId === null) {
      const defaultChatbotId = allChatbots[0].id;
      setSelectedChatbotId(defaultChatbotId);
      setGlobalChatbotId(defaultChatbotId);
    }
  }, [allChatbots]);

  const handleDeleteChatbot = async () => {
    if (!selectedChatbotId || !allChatbots) return;

    const confirmed = await confirm({
      description: "Are you sure you want to delete this chatbot?",
    });
    if (!confirmed) return;

    deleteChatbot(selectedChatbotId, {
      onSuccess: () => {
        toast.success("Chatbot deleted successfully");

        const updatedChatbots = allChatbots.filter(
          (cb) => cb.id !== selectedChatbotId,
        );
        if (updatedChatbots.length > 0) {
          const deletedIndex = allChatbots.findIndex(
            (cb) => cb.id === selectedChatbotId,
          );
          const nextIndex =
            deletedIndex < updatedChatbots.length
              ? deletedIndex
              : updatedChatbots.length - 1;
          const nextChatbotId = updatedChatbots[nextIndex].id;
          setSelectedChatbotId(nextChatbotId);
          setGlobalChatbotId(nextChatbotId);
        } else {
          setSelectedChatbotId(null);
          setGlobalChatbotId(null);
        }
      },
    });
  };

  const handleSendQuery = () => {
    if (!inputQuery.trim().length || messageMutate.isPending) return;
    handler.append({ content: inputQuery, source: ChatBotSource.HUMAN });
    setInputQuery("");
    messageMutate.mutate(
      { query: inputQuery, chatbotId: selectedChatbotId },
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
      <ConfirmDialog />
      <PublishChatbot selectedChatbotId={selectedChatbotId} />
      <Flex justify="space-between" align="center" mb="sm" wrap="wrap" gap="md">
        <RateupButtonBlue
          title="Create New Chatbot"
          rightIcon={<IconPlus />}
          onClick={handleCreateNewChatbotClick}
        />
        <Stack>
          <Select
            label="Select Chatbot"
            placeholder="Choose a chatbot"
            data={
              allChatbots?.map((chatbot) => ({
                value: chatbot.id,
                label: chatbot.name,
              })) || []
            }
            value={selectedChatbotId}
            onChange={handleChatbotSelect}
            disabled={isLoadingChatbots}
            error={isErrorChatbots ? "Failed to load chatbots" : ""}
            searchable
            w={250}
          />
          <RateupButtonBlue
            title="Delete"
            onClick={handleDeleteChatbot}
            disabled={!selectedChatbotId || allChatbots?.length === 0}
          />
        </Stack>
      </Flex>
      <CreateNewChatbot
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateChatbot}
      />
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
          <ChatbotResources
            selectedChatbotId={selectedChatbotId}
            enableApi={activetab === ChatbotTab.Resources}
          />
        </Tabs.Panel>
        <Tabs.Panel value={ChatbotTab.WaSettings}>
          <WhatsAppAIChatConfiguration selectedChatbotId={selectedChatbotId} />
        </Tabs.Panel>
        <Tabs.Panel value={ChatbotTab.UserChats} p={"sm"} h={"73dvh"}>
          <ChatHistory
            selectedChatbotId={selectedChatbotId}
            enableApi={activetab === ChatbotTab.UserChats}
          />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

export default ChatBot;
