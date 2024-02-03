import { Grid, SimpleGrid, Stack } from "@mantine/core";
import { useTestimonialSurveys } from "../../../backend/testimonials/testimonial.query";
import TestimonialSurveyCard from "../../../components/testimonial/TestimonialSurveyCard";
import { TeamSelector } from "../../../components/input/TeamSelector";
import { useState } from "react";
import Heading from "../../../components/styled/Heading/Heading";
import { useSurveysWithQuestions } from "../../../backend/surveys/surveys.query";
import { QuestionType } from "../../../types/enums";

export default function () {
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const {
    data: allSurveys,
    isLoading,
    isError,
  } = useSurveysWithQuestions(!!selectedTeamId);
  const surveys =
    selectedTeamId === "all" || !selectedTeamId
      ? allSurveys
      : allSurveys?.filter(
          (s: Survey) => s?.teams?.some((team) => team?.id === selectedTeamId),
        );
  const filteredSurveys = surveys?.filter(
    (s) =>
      s?.questions?.some((q: Question) => q?.type == QuestionType.Testimonial),
  );
  return (
    <Stack>
      <Heading title="Testimonial Surveys" titleprops={{ w: "fit-content" }} />

      <Grid columns={12}>
        <Grid.Col span={3}>
          <TeamSelector
            value={selectedTeamId}
            onChange={(teamId) => setSelectedTeamId(teamId)}
            enableAll={true}
          />
        </Grid.Col>
        <Grid.Col span={9}>
          <SimpleGrid cols={1}>
            {filteredSurveys?.map((survey) => (
              <TestimonialSurveyCard survey={survey} />
            ))}
          </SimpleGrid>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
