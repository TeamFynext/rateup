import { useQuery } from "@tanstack/react-query";
import {
  getResponses,
  getResponsesBySurveyId,
  getSurveys,
  getWaFlowFromDb,
  getWaFlowsFromDb,
} from "./flow.api";

export const useWaFlowsFromDb = (enabled = true) =>
  useQuery({
    queryKey: ["flow", "db"],
    queryFn: getWaFlowsFromDb,
    enabled,
  });

export const useWaFlowFromDb = (dbFlowId: string) =>
  useQuery({
    queryKey: ["flow", "db", dbFlowId],
    queryFn: () => getWaFlowFromDb(dbFlowId),
    enabled: !!dbFlowId,
  });

  export const useResponses = (surveyTeamMapId: string) =>
  useQuery({
    queryKey: ["responses", surveyTeamMapId],
    queryFn: () => getResponses(surveyTeamMapId),
    enabled: !!surveyTeamMapId,
  });


  export const useResponsesBySurvey = (surveyId, filter) => {
  const filterQuery = Object.entries(filter)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return useQuery({
    queryFn: () => getResponsesBySurveyId(surveyId, filterQuery),
    queryKey: ["response", "survey", surveyId, filter],
  });
};

export const useSurveys = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ["surveys"],
    queryFn: getSurveys,
    enabled,
  });
};