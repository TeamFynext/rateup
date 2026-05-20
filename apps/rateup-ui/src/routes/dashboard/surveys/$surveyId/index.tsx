import { createFileRoute } from "@tanstack/react-router";

import SurveyID from "@/components/Survey/SurveyId.tsx";

export const Route = createFileRoute("/dashboard/surveys/$surveyId/")({
  component: SurveyById,
});

function SurveyById() {
  return <SurveyID />;
}
