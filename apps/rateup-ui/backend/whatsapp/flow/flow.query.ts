import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUnsyncedFlows,
  getWaFlowsFromDb,
  getWaFlowsFromWa,
  getWaFlowJson,
  importFlows,
  getWaFlowFromDb,
  createFlowInput,
  createFlow,
  updateFlow,
  getFlowPreview,
  deleteFlow,
  publishFlow,
  deprecateFlow,
  cloneFlows,
  cloneAndDeprecateFlows,
  cloneFlowsProps,
  sendFlow,
} from "./flow.api";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";

export const useWaFlowsFromDb = () =>
  useQuery({
    queryKey: ["flow", "db"],
    queryFn: getWaFlowsFromDb,
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
    onError: (error) => {
      showErrorToast(error?.message ?? "Error creating flows");
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
    mutationFn: (dbFlowId: string) => sendFlow(dbFlowId, phone),
    onSuccess: () => {
      showSuccessToast("Flow Sent Successfully");
    },
    onError: () => {
      showErrorToast("Error sending flow");
    },
  });
};
