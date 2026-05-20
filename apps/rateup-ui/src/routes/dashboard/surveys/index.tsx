"use client";

import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { useSurveys } from "@/backend/surveys/surveys.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { SurveysPageError } from "@/components/Survey/SurveysPage/SurveyPageError.tsx";
import { SurveysPage } from "@/components/Survey/SurveysPage/SurveysPage.tsx";

export const Route = createFileRoute("/dashboard/surveys/")({
  component: Surveys,
});

function Surveys() {
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const { isLoading, error, data: allSurveys, refetch } = useSurveys();

  if (isLoading) return <RateupLoader />;
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
