import { ActionIcon, Grid, Group, Stack, Textarea } from "@mantine/core";
import { useDisclosure, useListState } from "@mantine/hooks";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { IconCheck, IconSend, IconX } from "@tabler/icons-react";
import ChatbotMessageContainer from "./ChatbotMessageContainer";
import {
  useChatMutation,
  useUplaodSourceForEmbed,
} from "../../../backend/chatbot/chatbot.query";
import { useState } from "react";
import {
  ContainedFileInput,
  ContainedSelection,
  ContainedTextField,
} from "../../../components/input/ContainedInput/ContainedInput";
import { RateupButtonBlue } from "../../../components/Button/RateupButtons";
import { ChatBotDataSourceType } from "../../../types/enums";
import { uploadFileForEmbed } from "../../../backend/chatbot/chatbot.api";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";

export enum ChatBotSource {
  HUMAN = "HUMAN",
  AI = "AI",
}

export type ChatBotMessage = {
  content: string;
  source: ChatBotSource;
};
const ChatBot = () => {
  const [inputQuery, setInputQuery] = useState("");
  const [source, setSource] = useState(ChatBotDataSourceType.FILE);
  const [url, setUrl] = useState("");
  const [messages, handler] = useListState<ChatBotMessage>([]);
  const messageMutate = useChatMutation();
  const [isUpload, setIsUpload] = useState(false);
  const uploadSourceForEmbedMutate = useUplaodSourceForEmbed();
  const [file, setFile] = useState<File>(null);

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

  const handleUplaod = async () => {
    setIsUpload(true);
    switch (source) {
      case ChatBotDataSourceType.WEB:
        if (!url) return;
        uploadSourceForEmbedMutate.mutate(
          {
            source: url,
            type: ChatBotDataSourceType.WEB,
          },
          {
            onSettled: () => setIsUpload(false),
          },
        );
        break;
      case ChatBotDataSourceType.FILE:
        if (!file) return;
        await uploadFileForEmbed(file).then(
          () => {
            setIsUpload(false);
            showSuccessToast(
              "File uploaded successfully",
              "file-upload",
              <IconCheck />,
            );
            setFile(null);
          },
          () => {
            setIsUpload(false);
            showErrorToast("Errror uploading file", "file-upload", <IconX />);
          },
        );
    }
  };

  return (
    <Grid columns={12}>
      <Grid.Col span={5}>
        <PaperLayout>
          <Stack gap={"sm"}>
            <ContainedSelection
              label="Select Source"
              data={Object.values(ChatBotDataSourceType)}
              value={source}
              onChange={(value) => setSource(value as ChatBotDataSourceType)}
              allowDeselect={false}
            />
            {source == ChatBotDataSourceType.WEB && (
              <ContainedTextField
                value={url}
                label="Enter web url"
                onChange={(e) => setUrl(e.currentTarget.value)}
                placeholder="Eg:https://www.example.com"
              />
            )}
            {source == ChatBotDataSourceType.FILE && (
              <ContainedFileInput
                label="Upload file"
                placeholder="Upload a pdf file (.pdf)"
                accept=".pdf"
                multiple={false}
                onChange={setFile}
              />
            )}
            <RateupButtonBlue
              title="Upload"
              onClick={handleUplaod}
              loading={isUpload}
            />
          </Stack>
        </PaperLayout>
      </Grid.Col>
      <Grid.Col span={7}>
        <PaperLayout>
          <Stack justify="flex-end" p={0}>
            <ChatbotMessageContainer
              messages={messages}
              isLoading={messageMutate.isPending}
            />
            <PaperLayout py={0} withBorder>
              <Group justify="space-between">
                <Textarea
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.currentTarget.value)}
                  placeholder="Type in.."
                  variant="unstyled"
                  w={"90%"}
                />
                <ActionIcon onClick={handleSendQuery}>
                  <IconSend />
                </ActionIcon>
              </Group>
            </PaperLayout>
          </Stack>
        </PaperLayout>
      </Grid.Col>
    </Grid>
  );
};

export default ChatBot;
