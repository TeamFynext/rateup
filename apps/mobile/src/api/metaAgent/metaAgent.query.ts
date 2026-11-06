import { useMutation, useQueries, useQuery } from "@tanstack/react-query";

import {
  getAgentBudgets,
  getConversationInsights,
  getMetaBusinessAgent,
  setThreadControl,
  type InsightsRange,
} from "./metaAgent.api";

/** The agent row of each number, in the order given. */
export const useMetaAgents = (waSettingsIds: string[], enabled = true) =>
  useQueries({
    queries: waSettingsIds.map((id) => ({
      queryKey: ["meta-agent", id],
      queryFn: () => getMetaBusinessAgent(id),
      enabled,
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });

/** Insights are fetched from Meta on request, so they are not refetched in the background. */
export const useConversationInsights = (waSettingsId: string, range: InsightsRange) =>
  useQuery({
    queryKey: ["meta-agent", waSettingsId, "insights", range.start_date, range.end_date],
    queryFn: () => getConversationInsights(waSettingsId, range),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

export const useAgentBudgets = (waSettingsId: string) =>
  useQuery({
    queryKey: ["meta-agent", waSettingsId, "budget"],
    queryFn: () => getAgentBudgets(waSettingsId),
    staleTime: 5 * 60_000,
    retry: false,
  });

export const useReleaseToMetaAi = () =>
  useMutation({
    mutationFn: (vars: { waSettingsId: string; to: string }) =>
      setThreadControl(vars.waSettingsId, "release", vars.to),
  });
