import React, { useState } from "react";

import { Stack } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";

import useTranslations from "@/dictionaries/useTranslation";

import { uploadFileForEmbed } from "../../backend/chatbot/chatbot.api";
import { useUploadSourceForEmbed } from "../../backend/chatbot/chatbot.query";
import { ChatBotDataSourceType } from "../../types/enums";
import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "../../utils/notifications";
import { RateupButtonBlue } from "../Button/RateupButtons";
import {
  ContainedFileInput,
  ContainedSelection,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import FormModalLayout from "../Modal/FormModalLayout";

const UploadChatbotSource = ({ opened, close, selectedChatbotId }) => {
  const [source, setSource] = useState(ChatBotDataSourceType.FILE);
  const [url, setUrl] = useState("");
  const [isUpload, setIsUpload] = useState(false);
  const uploadSourceForEmbedMutate = useUploadSourceForEmbed();
  const [file, setFile] = useState<File>(null);
  const queryClient = useQueryClient();
  const { translations } = useTranslations();
  const handleUplaod = async () => {
    setIsUpload(true);
    switch (source) {
      case ChatBotDataSourceType.WEB:
        if (!url) return;
        uploadSourceForEmbedMutate.mutate(
          {
            source: url,
            type: ChatBotDataSourceType.WEB,
            chatbotId: selectedChatbotId,
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
        if (file.size > 1048576 * 10)
          showLoadingToast(
            translations[
              "Hold on..file is getting uploaded. It may take few minutes"
            ],
            "file-upload",
            true,
            translations["Uploading"],
            "teal",
            false,
          );
        else
          showLoadingToast(
            translations["Hold on..file is getting uploaded"],
            "file-upload",
            true,
            translations["Uploading"],
            "teal",
            false,
          );
        await uploadFileForEmbed(file, selectedChatbotId).then(
          () => {
            setIsUpload(false);
            showSuccessToast(
              translations["File uploaded successfully"],
              "file-upload",
              <IconCheck />,
              true,
            );
            queryClient.invalidateQueries({ queryKey: ["chatbotResources"] });
            setFile(null);
            close();
          },
          () => {
            setIsUpload(false);
            showErrorToast(
              translations["Errror uploading file"],
              "file-upload",
              <IconX />,
              true,
            );
            close();
          },
        );
    }
  };

  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={translations["Upload Source"]}
      centered
    >
      <Stack gap={"sm"}>
        <ContainedSelection
          label={translations["Select Source"]}
          data={Object.values(ChatBotDataSourceType)}
          value={source}
          onChange={(value) => setSource(value as ChatBotDataSourceType)}
          allowDeselect={false}
        />
        {source == ChatBotDataSourceType.WEB && (
          <ContainedTextField
            value={url}
            label={translations["Enter web url"]}
            onChange={(e) => setUrl(e.currentTarget.value)}
            placeholder={translations["Eg:https://www.example.com"]}
          />
        )}
        {source == ChatBotDataSourceType.FILE && (
          <ContainedFileInput
            label={translations["Upload file"]}
            placeholder={translations["Upload a pdf file (.pdf/.epub)"]}
            accept=".pdf,.epub"
            multiple={false}
            onChange={setFile}
          />
        )}
        <RateupButtonBlue
          title={translations["Upload"]}
          onClick={handleUplaod}
          loading={isUpload}
          disabled={!file && !url}
        />
      </Stack>
    </FormModalLayout>
  );
};

export default UploadChatbotSource;
