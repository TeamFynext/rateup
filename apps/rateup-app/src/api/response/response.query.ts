import { useQuery } from "@tanstack/react-query";
import {
  getResponses,
  getResponsesBySurveyId,
  getSurveyResponseAnalyics,
} from "./response.api";

export const useResponseAnalytics = (surveyId: any, filter: any) => {
  const filterQuery = Object.entries(filter)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return useQuery({
    queryFn: () => getSurveyResponseAnalyics(surveyId, filterQuery),
    queryKey: ["responnseAnalytics", surveyId, filter],
    enabled: !!surveyId,
  });
};

export const useResponsesBySurvey = (surveyId: any, filter: any) => {
  const filterQuery = Object.entries(filter)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return useQuery({
    queryFn: () => getResponsesBySurveyId(surveyId, filterQuery),
    queryKey: ["response", "survey", surveyId, filter],
  });
};

export const useResponses = (surveyTeamMapId: string) =>
  useQuery({
    queryKey: ["responses", surveyTeamMapId],
    queryFn: () => getResponses(surveyTeamMapId),
    enabled: !!surveyTeamMapId,
  });
