import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import {
  cloneAndDeprecateFlows,
  cloneFlows,
  cloneFlowsProps,
  createFlow,
  createFlowInput,
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

export const useWaFlowsFromDb = (enabled = true) =>
  useQuery({
    queryKey: ["flow", "db"],
    queryFn: getWaFlowsFromDb,
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
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      showSuccessToast("Flows Imported Successfully");
    },
    onError: () => {
      showErrorToast("Error importing flows");
    },
  });
};

export const useCloneAndDeprecateFlowsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (flowId: string) => cloneAndDeprecateFlows(flowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flow"] });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      showSuccessToast(
        "Copy & Renew Flow Successfully",
        "copy-renew",
        "",
        true,
      );
    },
    onError: () => {
      showErrorToast("Error Copy & Renew Flow", "copy-renew", "", true);
    },
  });
};

export const useCloneFlowsMutation = (onSucess: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ flowId, teamId }: cloneFlowsProps) =>
      cloneFlows({ flowId, teamId }),
    onSuccess: () => {
      onSucess();
      queryClient.invalidateQueries({ queryKey: ["flow"] });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      showSuccessToast("Clone Flow Successfully", "copy", "", true);
    },
    onError: () => {
      showErrorToast("Error Clone Flow", "copy", "", true);
    },
  });
};

export const useCreateFlowMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: createFlowInput) => createFlow(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flow"] });
      qc.invalidateQueries({ queryKey: ["surveys"] });
      showSuccessToast("Flow Created Successfully");
    },
    onError: (error: any) => {
      showErrorToast(error?.response?.data?.message ?? "Error creating flows");
    },
  });
};
export const useUpdateFlowMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      dbFlowId: string;
      data: Partial<Omit<DbFlow, "dbFlowId">>;
    }) => updateFlow(data.dbFlowId, data.data),
    onSuccess: () => {
      showSuccessToast("Saved Changes..", "flow-update", "", true);
      qc.invalidateQueries({ queryKey: ["flow"] });
      qc.invalidateQueries({ queryKey: ["surveys"] });
    },
    onError: (e) => {
      showErrorToast("Error saving flows");
    },
  });
};

export const useDeleteFlowMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteFlow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flow"] });
      qc.invalidateQueries({ queryKey: ["surveys"] });
      showSuccessToast("Flow Deleted Successfully");
    },
    onError: () => {
      showErrorToast("Error deleting flows");
    },
  });
};

export const usePublishFlowMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: publishFlow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flow"] });
      showSuccessToast("Flow Published Successfully");
    },
    onError: () => {
      showErrorToast("Error publishing flows");
    },
  });
};

export const useDeprecateFlowMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deprecateFlow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flow"] });
      showSuccessToast("Flow Deprecated Successfully");
    },
    onError: () => {
      showErrorToast("Error deprecating flows");
    },
  });
};

export const useSendFlowToUser = (phone: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dbFlowId,
      teamId,
      flowId,
      whatsappSettingsPhoneId,
    }: {
      dbFlowId: string;
      teamId: string;
      flowId: string;
      whatsappSettingsPhoneId: string;
    }) => sendFlow(dbFlowId, phone, teamId, flowId, whatsappSettingsPhoneId),
    onSuccess: () => {
      showSuccessToast("Flow Sent Successfully");
    },
    onError: () => {
      showErrorToast("Error sending flow");
    },
  });
};

export const useUpdateFlowMetaDataMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      dbFlowId: string;
      data: { name: string; anonymous: boolean };
    }) => updateFlowMetaData(data.dbFlowId, data.data),
    onSuccess: () => {
      showSuccessToast("Saved Changes..", "flow-meta-data-update", "", true);
      qc.invalidateQueries({ queryKey: ["flow"] });
      qc.invalidateQueries({ queryKey: ["surveys"] });
    },
    onError: (e) => {
      showErrorToast("Error saving flows");
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
