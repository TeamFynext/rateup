import {
  Avatar,
  Group,
  Loader,
  ScrollAreaAutosize,
  Stack,
  Text,
} from "@mantine/core";
import { ChatBotMessage, ChatBotSource } from ".";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";

interface ChatbotMessageContainerProps {
  messages: ChatBotMessage[];
  isLoading: boolean;
}

const ChatbotMessageContainer = ({
  messages,
  isLoading,
}: ChatbotMessageContainerProps) => {
  console.log(messages);
  return (
    <ScrollAreaAutosize h={470}>
      <Stack justify="flex-end" p={"xs"} gap={"xs"}>
        {messages?.map((message) => (
          <Group
            justify={
              message.source == ChatBotSource.HUMAN ? "flex-end" : "flex-start"
            }
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
                      message.source == ChatBotSource.HUMAN
                        ? null
                        : "../images/chatbot.png"
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
      </Stack>
      {isLoading && (
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
                <Avatar src={"../images/chatbot.png"} size={"sm"} />
                <Text c={"var(--tertiary-color)"} fw={"bold"} size="sm">
                  AI
                </Text>
              </Group>
              <Loader type="dots" />
            </Stack>
          </PaperLayout>
        </Group>
      )}
    </ScrollAreaAutosize>
  );
};

export default ChatbotMessageContainer;
