import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { IntegratedApps } from "@/types/enums.ts";

import {
  getHubSpotPipelines,
  getHubSpotStatus,
  startHubSpotBulk,
  updateHubSpotSettings,
  type HubSpotBulkKind,
} from "./hubspot.api";

/** Under `integrationKeys.byType("hubspot")`, so a connect or disconnect invalidation reaches it. */
const hubSpotKeys = {
  status: () => ["integrations", IntegratedApps.hubspot, "status"] as const,
  pipelines: () => ["integrations", IntegratedApps.hubspot, "pipelines"] as const,
};

export function useHubSpotStatus() {
  return useQuery({
    queryKey: hubSpotKeys.status(),
    queryFn: getHubSpotStatus,
    // While a first-time sync runs, its counts move; check every few seconds.
    refetchInterval: (query) => {
      const status = query.state.data;
      const running =
        status?.connected &&
        Object.values(status.bulk ?? {}).some((run) => run?.status === "running");
      return running ? 3000 : false;
    },
  });
}

type ApiError = { response?: { data?: { error?: string } }; message?: string };

export function useUpdateHubSpotSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateHubSpotSettings,
    onSuccess: (status) => queryClient.setQueryData(hubSpotKeys.status(), status),
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.error ?? error?.message ?? "Could not save the setting", {
        id: "hubspot-settings",
      });
    },
  });
}

/** The account's deal pipelines. Fetched when the Deals card is showing, and on demand. */
export function useHubSpotPipelines(enabled: boolean) {
  return useQuery({
    queryKey: hubSpotKeys.pipelines(),
    queryFn: getHubSpotPipelines,
    enabled,
    staleTime: 60_000,
  });
}

export function useStartHubSpotBulk(kind: HubSpotBulkKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => startHubSpotBulk(kind),
    onSuccess: (status) => queryClient.setQueryData(hubSpotKeys.status(), status),
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.error ?? error?.message ?? "Could not start", {
        id: `hubspot-${kind}`,
      });
    },
  });
}
