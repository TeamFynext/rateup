import { Loader } from "@mantine/core";
import { useSurveys } from "../../../backend/surveys/surveys.query";
import { SurveysPage } from "../../../components/Survey/SurveysPage/SurveysPage";
import { SurveysPageError } from "../../../components/Survey/SurveysPage/SurveyPageError";
import { useState } from "react";

export default function Surveys() {
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const { isLoading, error, data: allSurveys, refetch } = useSurveys();

  if (isLoading) return <Loader type="bars" />;
  if (error || !Array.isArray(allSurveys)) {
    console.error(allSurveys, error);
    return <SurveysPageError refetch={refetch} />;
  }
  return (
    <SurveysPage
      allSurveys={allSurveys.filter((s) => s.type === "web")}
      selectedTeamId={selectedTeamId}
      setSelectedTeamId={setSelectedTeamId}
      refetch={refetch}
    />
  );
}
