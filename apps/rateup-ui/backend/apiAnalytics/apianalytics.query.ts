import { useQuery } from "@tanstack/react-query";

import {
  getApiAnalyticsOverview,
  getDeliveredFailedTrend,
  getTeamOverview,
  getTemplateOverview,
} from "./apianalytics.api";

export const useGetApiAnlayticsOverview = (filter) => {
  return useQuery({
    queryFn: () => getApiAnalyticsOverview(filter),
    queryKey: ["analyticsapiOverview", filter],
  });
};

export const useGetDeliveredFailedTrend = (filter) => {
  return useQuery({
    queryFn: () => getDeliveredFailedTrend(filter),
    queryKey: ["deliveredfailedtrend", filter],
  });
};

export const useGetTemplateOverview = (filter) => {
  return useQuery({
    queryFn: () => getTemplateOverview(filter),
    queryKey: ["templateapioverview", filter],
  });
};

export const useGetTeamApiOverview = (filter) => {
  return useQuery({
    queryFn: () => getTeamOverview(filter),
    queryKey: ["teamapioverview", filter],
  });
};
