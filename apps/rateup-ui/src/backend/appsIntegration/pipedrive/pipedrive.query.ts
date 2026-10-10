import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { IntegratedApps } from "@/types/enums.ts";

import {
  getPipedrivePipelines,
  getPipedriveStatus,
  repairPipedriveWebhooks,
  startPipedriveBulk,
  updatePipedriveSettings,
  type PipedriveBulkKind,
} from "./pipedrive.api";

/** Under `integrationKeys.byType("pipedrive")`, so a connect or disconnect invalidation reaches it. */
const pipedriveKeys = {
  status: () => ["integrations", IntegratedApps.pipedrive, "status"] as const,
  pipelines: () => ["integrations", IntegratedApps.pipedrive, "pipelines"] as const,
};

export function usePipedriveStatus() {
  return useQuery({
    queryKey: pipedriveKeys.status(),
    queryFn: getPipedriveStatus,
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

export function useStartPipedriveBulk(kind: PipedriveBulkKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => startPipedriveBulk(kind),
    onSuccess: (status) => queryClient.setQueryData(pipedriveKeys.status(), status),
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.error ?? error?.message ?? "Could not start", {
        id: `pipedrive-${kind}`,
      });
    },
  });
}

type ApiError = { response?: { data?: { error?: string } }; message?: string };

export function useUpdatePipedriveSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePipedriveSettings,
    onSuccess: (status) => queryClient.setQueryData(pipedriveKeys.status(), status),
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.error ?? error?.message ?? "Could not save the setting", {
        id: "pipedrive-settings",
      });
    },
  });
}

export function useRepairPipedriveWebhooks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: repairPipedriveWebhooks,
    onSuccess: (status) => {
      queryClient.setQueryData(pipedriveKeys.status(), status);
      toast.success("Webhooks registered", { id: "pipedrive-webhooks" });
    },
    onError: (error: ApiError) => {
      toast.error(
        error?.response?.data?.error ?? error?.message ?? "Could not register the webhooks",
        { id: "pipedrive-webhooks" },
      );
    },
  });
}

/** The company's deal pipelines. Fetched when the Deals card is showing, and on demand. */
export function usePipedrivePipelines(enabled: boolean) {
  return useQuery({
    queryKey: pipedriveKeys.pipelines(),
    queryFn: getPipedrivePipelines,
    enabled,
    staleTime: 60_000,
  });
}
