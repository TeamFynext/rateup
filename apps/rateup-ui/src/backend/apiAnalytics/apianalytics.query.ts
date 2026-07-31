import { useQuery } from "@tanstack/react-query";

import { teamKeys } from "@/backend/org/org.keys";
import type { QueryFilter } from "@/types/api.ts";

import {
  getApiAnalyticsOverview,
  getDeliveredFailedTrend,
  getTeamOverview,
  getTemplateOverview,
} from "./apianalytics.api";

export const useGetApiAnlayticsOverview = (filter: QueryFilter) => {
  return useQuery({
    queryFn: () => getApiAnalyticsOverview(filter),
    queryKey: ["analyticsapiOverview", filter],
  });
};

export const useGetDeliveredFailedTrend = (filter: QueryFilter) => {
  return useQuery({
    queryFn: () => getDeliveredFailedTrend(filter),
    queryKey: ["deliveredfailedtrend", filter],
  });
};

export const useGetTemplateOverview = (filter: QueryFilter) => {
  return useQuery({
    queryFn: () => getTemplateOverview(filter),
    queryKey: ["templateapioverview", filter],
  });
};

export const useGetTeamApiOverview = (filter: QueryFilter) => {
  return useQuery({
    queryFn: () => getTeamOverview(filter),
    queryKey: teamKeys.apiOverview(filter),
  });
};
