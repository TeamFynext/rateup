import React, { useState } from "react";
import FormModalLayout from "../Modal/FormModalLayout";
import { Stack } from "@mantine/core";
import { RateupButtonBlue } from "../Button/RateupButtons";
import {
  ContainedSelection,
  ContainedTextField,
  ContainedFileInput,
} from "../input/ContainedInput/ContainedInput";
import { ChatBotDataSourceType } from "../../types/enums";
import { useUploadSourceForEmbed } from "../../backend/chatbot/chatbot.query";
import { IconCheck, IconX } from "@tabler/icons-react";
import { uploadFileForEmbed } from "../../backend/chatbot/chatbot.api";
import { showSuccessToast, showErrorToast } from "../../utils/notifications";
import { useQueryClient } from "@tanstack/react-query";

const UploadChatbotSource = ({ opened, close }) => {
  const [source, setSource] = useState(ChatBotDataSourceType.FILE);
  const [url, setUrl] = useState("");
  const [isUpload, setIsUpload] = useState(false);
  const uploadSourceForEmbedMutate = useUploadSourceForEmbed();
  const [file, setFile] = useState<File>(null);
  const queryClient = useQueryClient();
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
            onSettled: () => {
              setIsUpload(false);
              close();
            },
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
            queryClient.invalidateQueries({ queryKey: ["chatbotResources"] });
            setFile(null);
            close();
          },
          () => {
            setIsUpload(false);
            showErrorToast("Errror uploading file", "file-upload", <IconX />);
            close();
          },
        );
    }
  };

  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={"Upload Source"}
      centered
    >
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
          disabled={!file && !url}
        />
      </Stack>
    </FormModalLayout>
  );
};

export default UploadChatbotSource;
