import { SimpleGrid } from "@mantine/core";
import { useTestimonialSurveys } from "../../../backend/testimonials/testimonial.query";
import TestimonialSurveyCard from "../../../components/testimonial/TestimonialSurveyCard";
import { TeamSelector } from "../../../components/input/TeamSelector";
import { useState } from "react";

export default function () {
  const { data: allSurveys } = useTestimonialSurveys();
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const filteredSurveys = allSurveys;

  return (
    <>
      <TeamSelector
        value={selectedTeamId}
        onChange={(teamId) => setSelectedTeamId(teamId)}
        enableAll={true}
      />
      <SimpleGrid cols={1}>
        {allSurveys?.map((survey) => <TestimonialSurveyCard survey={survey} />)}
      </SimpleGrid>
    </>
  );
}
