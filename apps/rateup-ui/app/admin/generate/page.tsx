"use client";

import React, { useState } from "react";

import { SimpleGrid, Stack } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";

import { useGenerateInboxResponse } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { isProduction } from "@/utils/constants";

import { useGenerateResponse } from "../../../backend/surveys/response/response.query";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import {
  ContainedNumberInput,
  ContainedTextField,
} from "../../../components/input/ContainedInput/ContainedInput";

const GenerateData = () => {
  const [selectedSurveyTeamMapId, setSelectedSurveyTeamMapId] = useState("");
  const [batchSize, setBatchSize] = useState(1);
  const [numberOfContacts, setNumberOfContacts] = useState(1);
  const [messagesPerContact, setMessagesPerContact] = useState(1);
  const generateResponse = useGenerateResponse(selectedSurveyTeamMapId);
  const generateInboxResponse = useGenerateInboxResponse();
  const translations = useTranslations();
  const handleSubmit = () => {
    notifications.show({
      id: "generateResponse",
      loading: true,
      title: translations("Generate Response"),
      message: translations("Hold on, response is getting generated"),
      autoClose: false,
      withCloseButton: false,
    });
    generateResponse.mutate({
      surveyTeamMapId: selectedSurveyTeamMapId,
      batchSize: batchSize,
    });
  };
  const handleWaChat = () => {
    notifications.show({
      id: "generateWaChat",
      loading: true,
      title: translations("Generate WhatsApp Chat"),
      message: translations("Hold on, WhatsApp chat is getting generated"),
      autoClose: false,
      withCloseButton: false,
    });
    generateInboxResponse.mutate({
      numberOfContacts: numberOfContacts,
      messagesPerContact: messagesPerContact,
    });
  };
  return (
    <SimpleGrid cols={{ base: 1, lg: 3 }}>
      {/* Generate Survey Response */}
      <Stack>
        <ContainedTextField
          label={translations("Enter surveyMapId")}
          placeholder={translations("Enter a surveyMapId")}
          onChange={(value) => setSelectedSurveyTeamMapId(value?.target?.value)}
        />
        <ContainedNumberInput
          label={translations("Number of generated data")}
          placeholder={translations("Enter the number of generated data")}
          defaultValue={1}
          min={1}
          onChange={(value) => setBatchSize(Number(value))}
        />
        <RateupButtonPrimary
          title={translations("Generate Survey Response")}
          size="md"
          onClick={handleSubmit}
          disabled={!selectedSurveyTeamMapId}
          loading={generateResponse?.isPending}
        />
      </Stack>
      {/* Generate WhatsApp Chat */}
      <Stack>
        <ContainedNumberInput
          label={translations("How many contacts to add message")}
          placeholder={translations("Enter number of contacts")}
          defaultValue={1}
          min={1}
          value={numberOfContacts}
          onChange={(value) => setNumberOfContacts(Number(value))}
        />
        <ContainedNumberInput
          label={translations("How many messages per contact")}
          placeholder={translations("Enter number of messages per contact")}
          defaultValue={1}
          min={1}
          value={messagesPerContact}
          onChange={(value) => setMessagesPerContact(Number(value))}
        />
        <RateupButtonPrimary
          title={translations("Generate WhatsApp Chat")}
          size="md"
          onClick={handleWaChat}
          disabled={isProduction}
        />
      </Stack>
    </SimpleGrid>
  );
};

export default GenerateData;
