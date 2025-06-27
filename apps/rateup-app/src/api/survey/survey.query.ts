import { useQuery } from "@tanstack/react-query";
import { getSurvey, getSurveys } from "./survey.api";

export const useSurveys = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ["surveys"],
    queryFn: getSurveys,
    enabled,
  });
};

export const useSurvey = (surveyId: string) => {
  return useQuery({
    queryKey: ["survey", surveyId],
    enabled: !!surveyId,
    queryFn: () => getSurvey(surveyId),
    refetchOnWindowFocus: "always",
  });
};
