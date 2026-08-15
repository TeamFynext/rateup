import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { surveyKeys } from "@/backend/surveys/survey.keys";

import type { cloneFlowsProps, createFlowInput } from "./flow.api";
import {
  cloneAndDeprecateFlows,
  cloneFlows,
  createFlow,
  deleteFlow,
  deprecateFlow,
  getFlowPreview,
  getUnsyncedFlows,
  getWaFlowFromDb,
  getWaFlowJson,
  getWaFlowMetrics,
  getWaFlowsFromDb,
  getWaFlowsFromWa,
  importFlows,
  publishFlow,
  pushFlowJsonToWa,
  sendFlow,
  updateFlow,
  updateFlowMetaData,
} from "./flow.api";

/**
 * @param whatsappSettingsPhoneId narrows the list to the flows that live on that
 *   number's WABA — see getWaFlowsFromDb. Part of the query key, so switching numbers
 *   refetches rather than reusing the previous number's flows.
 */
export const useWaFlowsFromDb = (enabled = true, whatsappSettingsPhoneId?: string) =>
  useQuery({
    // "list" keeps this apart from useWaFlowFromDb's ["flow", "db", dbFlowId].
    queryKey: ["flow", "db", "list", whatsappSettingsPhoneId ?? null],
    queryFn: () => getWaFlowsFromDb(whatsappSettingsPhoneId),
    enabled,
  });

export const useWaFlowsFromWa = () =>
  useQuery({
    queryKey: ["flow", "wa"],
    queryFn: getWaFlowsFromWa,
  });

export const useUnsyncedFlows = (enabled: boolean) =>
  useQuery({
    queryKey: ["flow", "wa"],
    queryFn: getUnsyncedFlows,
    enabled,
  });

export const useWaFlowFromDb = (dbFlowId: string) =>
  useQuery({
    queryKey: ["flow", "db", dbFlowId],
    queryFn: () => getWaFlowFromDb(dbFlowId),
    enabled: !!dbFlowId,
  });

export const useWaFlowJson = (flowId: string) =>
  useQuery({
    queryKey: ["flow", "wa", flowId],
    queryFn: () => getWaFlowJson(flowId),
    enabled: !!flowId,
  });

export const useWaFlowPreview = (dbFlowId: string) =>
  useQuery({
    queryKey: ["flow", "preview", dbFlowId],
    queryFn: () => getFlowPreview(dbFlowId),
    enabled: !!dbFlowId,
  });

export const useWaFlowMetrics = (dbFlowId: string, enabled: boolean) =>
  useQuery({
    queryKey: ["flow-metrics", dbFlowId],
    queryFn: () => getWaFlowMetrics(dbFlowId),
    enabled,
  });

export const useImportFlowsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      waFlowIds,
      teamIds,
      mapData,
    }: {
      waFlowIds: string[];
      teamIds: string[];
      mapData: object;
    }) => importFlows(waFlowIds, teamIds, mapData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flow"] });
      queryClient.invalidateQueries({ queryKey: surveyKeys.all() });
      toast.success("Flows Imported Successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error importing flows");
    },
  });
};

export const useCloneAndDeprecateFlowsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (flowId: string) => cloneAndDeprecateFlows(flowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flow"] });
      queryClient.invalidateQueries({ queryKey: surveyKeys.all() });
      toast.success("Copy & Renew Flow Successfully", {
        id: "copy-renew",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Error Copy & Renew Flow", {
        id: "copy-renew",
      });
    },
  });
};

export const useCloneFlowsMutation = (onSucess: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ flowId, teamId }: cloneFlowsProps) => cloneFlows({ flowId, teamId }),
    onSuccess: () => {
      onSucess();
      queryClient.invalidateQueries({ queryKey: ["flow"] });
      queryClient.invalidateQueries({ queryKey: surveyKeys.all() });
      toast.success("Clone Flow Successfully", {
        id: "copy",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Error Clone Flow", {
        id: "copy",
      });
    },
  });
};

export const useCreateFlowMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: createFlowInput) => createFlow(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flow"] });
      qc.invalidateQueries({ queryKey: surveyKeys.all() });
      toast.success("Flow Created Successfully");
    },
    onError: (error) => {
      toast.error(error?.message || (error?.message ?? "Error creating flows"));
    },
  });
};
export const useUpdateFlowMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { dbFlowId: string; data: Partial<Omit<DbFlow, "dbFlowId">> }) =>
      updateFlow(data.dbFlowId, data.data),
    onSuccess: () => {
      toast.success("Saved Changes..", {
        id: "flow-update",
      });
      qc.invalidateQueries({ queryKey: ["flow"] });
      qc.invalidateQueries({ queryKey: surveyKeys.all() });
    },
    onError: (error) => {
      toast.error(error?.message || "Error saving flows");
    },
  });
};

export const useDeleteFlowMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteFlow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flow"] });
      qc.invalidateQueries({ queryKey: surveyKeys.all() });
      toast.success("Flow Deleted Successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error deleting flows");
    },
  });
};

export const usePublishFlowMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: publishFlow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flow"] });
      toast.success("Flow Published Successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error publishing flows");
    },
  });
};

export const useDeprecateFlowMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deprecateFlow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flow"] });
      toast.success("Flow Deprecated Successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error deprecating flows");
    },
  });
};

export const useSendFlowToUser = (phone: string | undefined) => {
  return useMutation({
    mutationFn: ({
      dbFlowId,
      teamId,
      flowId,
      whatsappSettingsPhoneId,
    }: {
      dbFlowId: string;
      teamId: string | null;
      flowId: string | undefined;
      whatsappSettingsPhoneId: string | undefined;
    }) =>
      sendFlow(dbFlowId, phone ?? "", teamId ?? "", flowId ?? "", whatsappSettingsPhoneId ?? ""),
    onSuccess: () => {
      toast.success("Flow Sent Successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error sending flow");
    },
  });
};

export const useUpdateFlowMetaDataMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { dbFlowId: string; data: { name: string; anonymous: boolean } }) =>
      updateFlowMetaData(data.dbFlowId, data.data),
    onSuccess: () => {
      toast.success("Saved Changes..", {
        id: "flow-meta-data-update",
      });
      qc.invalidateQueries({ queryKey: ["flow"] });
      qc.invalidateQueries({ queryKey: surveyKeys.all() });
    },
    onError: (error) => {
      toast.error(error?.message || "Error saving flows");
    },
  });
};

export const usePushToWaMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pushFlowJsonToWa,
    onSuccess: (_, dbFlowId) => {
      toast.success("Flow saved to WhatsApp successfully");
      qc.invalidateQueries({ queryKey: ["flow", "db", dbFlowId] });
    },
  });
};
