import { Box, Title } from "@mantine/core";
import { useRouter } from "next/router";
import React from "react";
import { usePublicSurvey } from "../../../backend/surveys/surveys.query";

const TakeSurveyLayout = ({children}) => {
  const {surveyId} = useRouter().query as { surveyId: string };
  const {isLoading, isError, data: survey} = usePublicSurvey(surveyId);

  if(isLoading || isError || !survey) return null;

  return (
    <Box sx={{ height: "100vh" }} p="sm">
      <Title order={2}>{survey.title}</Title>
      {/* TODO: Why children.children? */}
        {children.children}
    </Box>
  );
};

export default TakeSurveyLayout;
