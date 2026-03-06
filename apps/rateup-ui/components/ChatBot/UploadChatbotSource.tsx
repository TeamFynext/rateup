"use client";

import React, { useState } from "react";

import { Stack } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { uploadFileForEmbed } from "../../backend/chatbot/chatbot.api";
import { useUploadSourceForEmbed } from "../../backend/chatbot/chatbot.query";
import { ChatBotDataSourceType } from "../../types/enums";
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
  const translations = useTranslations();
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
          toast.loading(
            translations(
              "Hold onfile is getting uploaded It may take few minutes",
            ),
            {
              id: "file-upload",
            },
          );
        else
          toast.loading(translations("Hold onfile is getting uploaded"), {
            id: "file-upload",
          });
        await uploadFileForEmbed(file, selectedChatbotId).then(
          () => {
            setIsUpload(false);
            toast.success(translations("File uploaded successfully"), {
              id: "file-upload",
            });
            queryClient.invalidateQueries({ queryKey: ["chatbotResources"] });
            setFile(null);
            close();
          },
          () => {
            setIsUpload(false);
            toast.error(translations("Errror uploading file"), {
              id: "file-upload",
            });
            close();
          },
        );
    }
  };

  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={translations("Upload Source")}
      centered
    >
      <Stack gap={"sm"}>
        <ContainedSelection
          label={translations("Select Source")}
          data={Object.values(ChatBotDataSourceType)}
          value={source}
          onChange={(value) => setSource(value as ChatBotDataSourceType)}
          allowDeselect={false}
        />
        {source == ChatBotDataSourceType.WEB && (
          <ContainedTextField
            value={url}
            label={translations("Enter web url")}
            onChange={(e) => setUrl(e.currentTarget.value)}
            placeholder={translations("Eg:https://wwwexamplecom")}
          />
        )}
        {source == ChatBotDataSourceType.FILE && (
          <ContainedFileInput
            label={translations("Upload file")}
            placeholder={translations("Upload a pdf file (.pdf/.epub)")}
            accept=".pdf,.epub"
            multiple={false}
            onChange={setFile}
          />
        )}
        <RateupButtonBlue
          title={translations("Upload")}
          onClick={handleUplaod}
          loading={isUpload}
          disabled={!file && !url}
        />
      </Stack>
    </FormModalLayout>
  );
};

export default UploadChatbotSource;
