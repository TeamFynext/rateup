import React, { useState } from "react";
import {
  ContainedNumberInput,
  ContainedTextField,
} from "../../../components/input/ContainedInput/ContainedInput";
import { SimpleGrid, Stack } from "@mantine/core";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import { useGenerateResponse } from "../../../backend/surveys/response/response.query";
import { notifications } from "@mantine/notifications";

const GenerateData = () => {
  const [selectedSurveyTeamMapId, setSelectedSurveyTeamMapId] = useState("");
  const [batchSize, setBatchSize] = useState(1);
  const generateResponse = useGenerateResponse(selectedSurveyTeamMapId);

  const handleSubmit = () => {
    notifications.show({
      id: "generateResponse",
      loading: true,
      title: "Generate Response",
      message: `Hold on, response is getting generated...`,
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
          label={"Enter surveyMapId"}
          placeholder="Enter a surveyMapId"
          onChange={(value) => setSelectedSurveyTeamMapId(value?.target?.value)}
        />
        <ContainedNumberInput
          label={"Number of generated data"}
          placeholder="Enter the number of generated data"
          defaultValue={1}
          min={1}
          onChange={(value) => setBatchSize(Number(value))}
        />
        <RateupButtonPrimary
          title="Generate"
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
