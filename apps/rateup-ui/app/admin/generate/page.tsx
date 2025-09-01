"use client";

import React, { useState } from "react";

import { SimpleGrid, Stack } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";

import { useGenerateResponse } from "../../../backend/surveys/response/response.query";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import {
  ContainedNumberInput,
  ContainedTextField,
} from "../../../components/input/ContainedInput/ContainedInput";

const GenerateData = () => {
  const [selectedSurveyTeamMapId, setSelectedSurveyTeamMapId] = useState("");
  const [batchSize, setBatchSize] = useState(1);
  const generateResponse = useGenerateResponse(selectedSurveyTeamMapId);
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
  return (
    <SimpleGrid cols={{ base: 1, lg: 3 }}>
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
          title={translations("Generate")}
          size="md"
          onClick={handleSubmit}
          disabled={!selectedSurveyTeamMapId}
          loading={generateResponse?.isPending}
        />
      </Stack>
    </SimpleGrid>
  );
};

export default GenerateData;
