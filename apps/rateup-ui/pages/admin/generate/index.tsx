import React, { useState } from "react";
import {
  ContainedNumberInput,
  ContainedSelection,
} from "../../../components/input/ContainedInput/ContainedInput";
import { useSurveys } from "../../../backend/surveys/surveys.query";
import CenteredSpinner from "../../../components/Loaders/CenteredSpinner";
import { SimpleGrid, Stack } from "@mantine/core";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import { useGenerateResponse } from "../../../backend/surveys/response/response.query";
import { notifications } from "@mantine/notifications";

const GenerateData = () => {
  const { data, isPending } = useSurveys(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [batchSize, setBatchSize] = useState(1);
  const generateResponse = useGenerateResponse(selectedSurveyId);

  if (isPending) return <CenteredSpinner />;
  let surveyFormatedData = [];
  if (Array.isArray(data)) {
    surveyFormatedData = data
      .filter((data) => data.isPublished)
      .map((survey) => ({
        value: survey?.id,
        label: survey.title,
      }));
  }
  const handleSubmit = () => {
    if (!Array.isArray(data)) return;
    notifications.show({
      id: "generateResponse",
      loading: true,
      title: "Generate Response",
      message: `Hold on, response is getting generated...`,
      autoClose: false,
      withCloseButton: false,
    });
    generateResponse.mutate({
      surveyId: selectedSurveyId,
      surveyTeamMapId: data.find((item) => item.id === selectedSurveyId)
        ?.teams?.[0]?.mapId,
      batchSize: batchSize,
    });
  };
  return (
    <SimpleGrid cols={{ base: 1, lg: 3 }}>
      <Stack>
        <ContainedSelection
          label="Choose a survey"
          placeholder={
            surveyFormatedData?.length === 0
              ? "There is no survay"
              : "Select survey"
          }
          disabled={surveyFormatedData?.length === 0}
          required
          allowDeselect={false}
          data={surveyFormatedData}
          onChange={(value) => setSelectedSurveyId(value)}
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
          disabled={!selectedSurveyId}
          loading={generateResponse?.isPending}
        />
      </Stack>
    </SimpleGrid>
  );
};

export default GenerateData;
