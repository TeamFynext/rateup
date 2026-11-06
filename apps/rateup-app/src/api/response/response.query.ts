import { useQuery } from "@tanstack/react-query";
import {
  getHappyIndex,
  getNPSSurveyResponseForGraph,
  getResponses,
  getResponsesBySurveyId,
  getSurveyResponseAnalyics,
  getSurveyResponseCount,
} from "./response.api";
import type { NpsGraphTimePeriod } from "./response.api";

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

export const useResponseCount = (surveyId: string) => {
  return useQuery({
    queryFn: () => getSurveyResponseCount(surveyId),
    queryKey: ["responseCount", surveyId],
    enabled: !!surveyId,
  });
};

export function useHappyIndex(surveyId: string) {
  return useQuery({
    queryKey: ["happy-index", surveyId],
    queryFn: () => getHappyIndex(surveyId),
    enabled: !!surveyId,
  });
}

export const useAllResponseNPSForGraph = (
  timePeriod: NpsGraphTimePeriod,
  userTimeZone: string,
  surveyId: string = "",
  teamMapIds: string[] = [],
) => {
  return useQuery({
    queryKey: ["reponse-nps", "graph-nps", timePeriod, userTimeZone, surveyId, teamMapIds],
    queryFn: () => getNPSSurveyResponseForGraph(timePeriod, userTimeZone, surveyId, teamMapIds),
  });
};
