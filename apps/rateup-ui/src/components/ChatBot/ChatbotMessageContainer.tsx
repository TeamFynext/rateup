import {
  ActionIcon,
  Avatar,
  Flex,
  Group,
  Loader,
  LoadingOverlay,
  ScrollAreaAutosize,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { getHotkeyHandler, useMediaQuery } from "@mantine/hooks";
import { IconPlus, IconSend } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { ChatBotSource } from "@/types/enums.ts";
import type { ChatBotMessage } from "@/types/global";

import { RateupButtonBlue } from "../Button/RateupButtons.tsx";
import PaperLayout from "../styled/Layouts/PaperLayout.tsx";

interface ChatbotMessageContainerProps {
  handleSendQuery: () => void;
  handleNewChat: () => void;
  messages: Array<ChatBotMessage>;
  inputQuery: string;
  setInputQuery;
  isMessagePending: boolean;
  isDeleteMessagePending: boolean;
  styleProps?;
  isPublicPage: boolean;
}

const ChatbotMessageContainer = ({
  handleSendQuery,
  handleNewChat,
  messages,
  inputQuery,
  setInputQuery,
  isMessagePending,
  isDeleteMessagePending,
  styleProps,
  isPublicPage,
}: ChatbotMessageContainerProps) => {
  const messagesEndRef = useRef(null);
  const isMobile = useMediaQuery("(max-width: 480px)");
  const scrollToBottom = () => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const { t: translations } = useTranslation();
  return (
    <Stack style={styleProps}>
      <Flex justify={"flex-start"}>
        <RateupButtonBlue
          title={translations("New Chat")}
          rightIcon={<IconPlus />}
          onClick={handleNewChat}
        />
      </Flex>
      <PaperLayout bg={"#f5f6fa"}>
        <Stack p={0}>
          <ScrollAreaAutosize h={isPublicPage ? 500 : 315} scrollbarSize={4}>
            {isDeleteMessagePending ? (
              <LoadingOverlay loaderProps={{ children: "Please wait..." }} />
            ) : (
              <Stack justify="flex-end" p={"xs"} gap={"xs"}>
                {messages?.map((message, index) => (
                  <Group
                    justify={message.source == ChatBotSource.HUMAN ? "flex-end" : "flex-start"}
                    key={index}
                  >
                    <PaperLayout
                      style={{
                        borderRadius:
                          message.source == ChatBotSource.HUMAN
                            ? "10px 10px 0px"
                            : "10px 10px 10px 0px",
                      }}
                      w={"fit-content"}
                      py={0}
                    >
                      <Stack gap={1} miw={200}>
                        <Group p={0} gap={"xs"}>
                          <Avatar
                            src={
                              message.source == ChatBotSource.HUMAN ? null : "/images/chatbot.png"
                            }
                            size={"sm"}
                          />
                          <Text
                            c={
                              message.source == ChatBotSource.HUMAN
                                ? "black"
                                : "var(--tertiary-color)"
                            }
                            fw={"bold"}
                            size="sm"
                          >
                            {message.source == ChatBotSource.HUMAN ? "You" : "AI"}{" "}
                          </Text>
                        </Group>
                        <Text>{message.content}</Text>
                      </Stack>
                    </PaperLayout>
                  </Group>
                ))}
                <div ref={messagesEndRef} />
              </Stack>
            )}
            {isMessagePending && (
              <Group justify={"flex-start"} p={"xs"}>
                <PaperLayout
                  style={{
                    borderRadius: "10px 10px 10px 0px",
                  }}
                  w={"fit-content"}
                  py={0}
                >
                  <Stack gap={1} miw={200}>
                    <Group p={0} gap={"xs"}>
                      <Avatar src={"/images/chatbot.png"} size={"sm"} />
                      <Text c={"var(--tertiary-color)"} fw={"bold"} size="sm">
                        {translations("AI")}
                      </Text>
                    </Group>
                    <Loader type="dots" />
                  </Stack>
                </PaperLayout>
              </Group>
            )}
          </ScrollAreaAutosize>
          <PaperLayout py={0} withBorder>
            <Group gap={0} justify="space-between">
              <Textarea
                value={inputQuery}
                onChange={(e) => setInputQuery(e.currentTarget.value)}
                placeholder={translations("Type in..")}
                variant="unstyled"
                w={"90%"}
                onKeyDown={getHotkeyHandler([["Enter", handleSendQuery]])}
                mah={100}
                mih={60}
                autosize
              />
              <ActionIcon onClick={handleSendQuery} size={isMobile ? "sm" : "md"}>
                {isMessagePending ? <Loader color="white" size={"xs"} /> : <IconSend />}
              </ActionIcon>
            </Group>
          </PaperLayout>
        </Stack>
      </PaperLayout>
    </Stack>
  );
};

export default ChatbotMessageContainer;
