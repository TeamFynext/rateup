import { useQuery } from "@tanstack/react-query";
import { getSurvey, getSurveys, getSurveyStats } from "./survey.api";

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

export const useGetSurveyStats = (surveyId:string) => {
  return useQuery({
    queryFn: () => getSurveyStats(surveyId),
    queryKey: ["SurveyStats", surveyId],
    enabled: !!surveyId,
  });
};
